// Remove only the uniform backdrop connected to the image border. The product,
// its labels and any enclosed white areas remain in place.
window.AlmeidaImageCleanup = (() => {
  const results = new Map();
  const pending = new Map();
  const maxSide = 800;

  function imageDataUrl(source, original) {
    if (results.has(source)) return Promise.resolve(results.get(source));
    if (pending.has(source)) return pending.get(source);

    const task = (async () => {
      if (!original.complete) await original.decode();
      const scale = Math.min(1, maxSide / Math.max(original.naturalWidth, original.naturalHeight));
      const width = Math.max(1, Math.round(original.naturalWidth * scale));
      const height = Math.max(1, Math.round(original.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(original, 0, 0, width, height);
      const image = context.getImageData(0, 0, width, height);
      if (removeBorderBackground(image)) {
        context.putImageData(image, 0, 0);
        return canvas.toDataURL('image/png');
      }
      return source;
    })().then(value => {
      results.set(source, value);
      pending.delete(source);
      return value;
    }, error => {
      pending.delete(source);
      throw error;
    });

    pending.set(source, task);
    return task;
  }

  function removeBorderBackground(image) {
    const { data, width, height } = image;
    const total = width * height;
    const samples = [];
    const step = Math.max(1, Math.floor(Math.max(width, height) / 160));
    for (let x = 0; x < width; x += step) {
      samples.push(x, (height - 1) * width + x);
    }
    for (let y = 0; y < height; y += step) {
      samples.push(y * width, y * width + width - 1);
    }

    let transparentEdges = 0;
    const colors = new Map();
    for (const pixel of samples) {
      const index = pixel * 4;
      if (data[index + 3] < 235) { transparentEdges++; continue; }
      const key = `${data[index] >> 4},${data[index + 1] >> 4},${data[index + 2] >> 4}`;
      const entry = colors.get(key) || { count: 0, r: 0, g: 0, b: 0 };
      entry.count++;
      entry.r += data[index];
      entry.g += data[index + 1];
      entry.b += data[index + 2];
      colors.set(key, entry);
    }
    if (transparentEdges > samples.length * 0.1) return false;
    const dominant = [...colors.values()].sort((a, b) => b.count - a.count)[0];
    if (!dominant || dominant.count < samples.length * 0.2) return false;

    const background = [dominant.r, dominant.g, dominant.b].map(sum => sum / dominant.count);
    const brightness = (background[0] + background[1] + background[2]) / 3;
    const colorRange = Math.max(...background) - Math.min(...background);
    if (brightness < 165 || colorRange > 55) return false;

    const visited = new Uint8Array(total);
    const queue = new Int32Array(total);
    let read = 0, write = 0, removed = 0;
    const limitSquared = 74 * 74;

    function add(pixel) {
      if (visited[pixel]) return;
      visited[pixel] = 1;
      const index = pixel * 4;
      const red = data[index] - background[0];
      const green = data[index + 1] - background[1];
      const blue = data[index + 2] - background[2];
      const distanceSquared = red * red + green * green + blue * blue;
      if (distanceSquared > limitSquared || data[index + 3] < 235) return;
      queue[write++] = pixel;
      const distance = Math.sqrt(distanceSquared);
      const alpha = Math.max(0, Math.min(255, Math.round((distance - 12) * 255 / 62)));
      data[index + 3] = Math.min(data[index + 3], alpha);
      removed++;
    }

    for (let x = 0; x < width; x++) { add(x); add((height - 1) * width + x); }
    for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
    while (read < write) {
      const pixel = queue[read++];
      const x = pixel % width;
      if (x) add(pixel - 1);
      if (x < width - 1) add(pixel + 1);
      if (pixel >= width) add(pixel - width);
      if (pixel < total - width) add(pixel + width);
    }
    return removed > total * 0.02;
  }

  async function prepare(image) {
    const source = image.getAttribute('src');
    if (!source) return;
    try {
      image.src = await imageDataUrl(source, image);
    } catch (error) {
      console.info('Foto original mantida.', error);
    } finally {
      image.classList.remove('processing');
    }
  }

  function watch(container = document) {
    for (const image of container.querySelectorAll('img[data-clean-image]')) prepare(image);
  }

  return { watch, prepare };
})();



