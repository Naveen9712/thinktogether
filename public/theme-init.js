// Runs before React to apply the saved (or device) theme without a flash. A file, not inline,
// so the Content-Security-Policy can forbid inline scripts.
(function () {
  var light = false;
  try {
    var saved = localStorage.getItem('tt_theme');
    light = saved ? saved === 'light' : window.matchMedia('(prefers-color-scheme: light)').matches;
  } catch (e) {
    light = false;
  }
  document.documentElement.classList.toggle('dark', !light);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', light ? '#f4f6fa' : '#0b0f1a');
})();
