// Keep every product photo exactly as supplied, including its original background.
window.AlmeidaImageCleanup = (() => {
  const whiteBackgroundProducts = new Set([
    'apc orange', 'carnauba plastic', 'couro premium', 'creamyx wax', 'cristal flex', 'detail finish',
    'graphene coating 9h', 'nc cut select', 'nc polish select', 'nc solution', 'nc technology',
    'off road cleaner', 'plastic protection', 'remox', 'restored plastic', 'viper'
  ]);

  function normalizeName(value) {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
  }

  function prepare(image) {
    if (image?.alt && whiteBackgroundProducts.has(normalizeName(image.alt))) {
      image.classList.add('white-photo-background');
    }
    image?.classList.remove('processing');
  }

  function watch(container = document) {
    for (const image of container.querySelectorAll('img[data-clean-image]')) prepare(image);
  }

  return { watch, prepare };
})();
