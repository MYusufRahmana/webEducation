window.S = () => {
  const q = (s) => document.querySelector(s);
  const cur = q('.step-map [aria-current="step"]');
  return [location.search + location.hash, cur && cur.textContent.trim(), q('#step-title') && q('#step-title').textContent, 'focus=' + (document.activeElement.id || document.activeElement.tagName), 'note=' + q('.figure-note').textContent.slice(0, 26), 'mode=' + q('.figure-note').dataset.kind, q('.state-readout').textContent].join(' | ');
};
