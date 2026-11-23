window.R = () => {
  const q = (s) => document.querySelector(s);
  const strips = [...document.querySelectorAll('.order')].map((o) => o.textContent.replace(/\s+/g, ' ')).join(' | ');
  const counts = [...document.querySelectorAll('.counts div')].map((d) => d.textContent).join(', ');
  return [q('.step-nav [aria-current]') && q('.step-nav [aria-current]').textContent, q('.state-title').textContent, q('.state-readout').textContent, strips, counts].join(' || ');
};
