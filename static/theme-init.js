(() => {
  try {
    if (localStorage.getItem('hai-theme') === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch {
    // ignore: storage may be disabled
  }
})();

