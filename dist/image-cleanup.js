// Keep every product photo exactly as supplied, including its original background.
window.AlmeidaImageCleanup = (() => {
  function prepare(image) {
    image?.classList.remove('processing');
  }

  function watch(container = document) {
    for (const image of container.querySelectorAll('img[data-clean-image]')) prepare(image);
  }

  return { watch, prepare };
})();
