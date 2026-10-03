// Reveal product photos after loading; their panel background is controlled uniformly by CSS.
window.AlmeidaImageCleanup = (() => {
  function prepare(image) {
    image?.classList.remove('processing');
  }

  function watch(container = document) {
    for (const image of container.querySelectorAll('img[data-clean-image]')) prepare(image);
  }

  return { watch, prepare };
})();
