// Apply the saved Classic/Kids style and text size before first paint (avoids a flash).
// A file, not an inline script, so the Content-Security-Policy can be script-src 'self' only.
try {
  var s = JSON.parse(localStorage.getItem('nextmove:settings') || '{}')
  if (s.mode === 'kids' || s.mode === 'classic') document.documentElement.dataset.mode = s.mode
  if (s.largeText === true) document.documentElement.dataset.text = 'large'
} catch {
  /* storage blocked: the default style */
}
