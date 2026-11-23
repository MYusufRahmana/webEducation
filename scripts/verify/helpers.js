window.R = () => {
  const q = (s) => document.querySelector(s);
  const order = [...document.querySelectorAll('.order-item')].map((e) => e.dataset.server + e.dataset.outcome[0]).join(' ');
  const rows = [...document.querySelectorAll('.servers tbody tr')].map((r) => [...r.children].map((c) => c.textContent).join('/')).join(' | ');
  return [q('.step-nav [aria-current]') && q('.step-nav [aria-current]').textContent, q('.state-title').textContent.replace(/^Fig 1 · /, ''), q('.state-readout').textContent, 'order: ' + order, rows].join(' || ');
};
window.T = () => parseFloat(document.querySelector('.state-readout').textContent.replace('t = ', '').replace(',', '.'));
window.P = () => getComputedStyle(document.querySelector('.story')).getPropertyValue('--p') + ' phase=' + document.querySelector('.story').dataset.phase + ' inert=' + document.querySelector('.figure-bar').hasAttribute('inert');
