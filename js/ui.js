// Small rendering helpers. All dynamic text goes through esc() before it reaches innerHTML.

export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const RAG_LABEL = { G: 'On track', A: 'At risk', R: 'Off track' };
export function rag(v, title = '') {
  return `<span class="rag rag-${esc(v)}" title="${esc(title || RAG_LABEL[v])}" aria-label="${esc(RAG_LABEL[v])}">${esc(v)}</span>`;
}

export function call(c) {
  const icon = { SCALE: '▲', CONTINUE: '✓', REVISE: '◆', STOP: '■' }[c] || '';
  return `<span class="call call-${esc(c)}">${icon} ${esc(c)}</span>`;
}

export function trend(it) {
  if (it.valueVar === null) return '<span class="muted">–</span>';
  const cls = it.trend === 'ahead' ? 'up' : it.trend === 'behind' ? 'down' : 'flat';
  const icon = { up: '▲', down: '▼', flat: '=' }[cls];
  const v = (it.valueVar * 100).toFixed(0);
  return `<span class="trend ${cls}">${icon} ${it.valueVar > 0 ? '+' : ''}${v}%</span>`;
}

export function sev(s) {
  return `<span class="sev sev-${esc(s)}">${esc(s)}</span>`;
}

export function tile(label, value, sub = '', cls = '') {
  return `<div class="tile ${cls}"><div class="tile-value">${value}</div><div class="tile-label">${esc(label)}</div>${sub ? `<div class="tile-sub">${sub}</div>` : ''}</div>`;
}

export function section(title, body, extra = '') {
  return `<section class="card"><header class="card-head"><h2>${esc(title)}</h2>${extra}</header>${body}</section>`;
}

export function pageHead(kicker, title, lede) {
  return `<header class="page-head"><div class="kicker">${esc(kicker)}</div><h1>${esc(title)}</h1>${lede ? `<p class="lede">${lede}</p>` : ''}</header>`;
}

export function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 3200);
}

export const eur = (k) => (Math.abs(k) >= 1000 ? `€${(k / 1000).toFixed(1)}m` : `€${Math.round(k)}k`);
