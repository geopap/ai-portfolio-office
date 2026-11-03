import { analyse } from './engine.js';
import { load, save, log } from './store.js';
import * as overview from './views/overview.js';
import * as portfolio from './views/portfolio.js';
import * as value from './views/value.js';
import * as prioritise from './views/prioritise.js';
import * as dependencies from './views/dependencies.js';
import * as capacity from './views/capacity.js';
import * as agent from './views/agent.js';
import * as report from './views/report.js';
import * as governance from './views/governance.js';
import * as audit from './views/audit.js';
import * as about from './views/about.js';

const ROUTES = { overview, portfolio, value, prioritise, dependencies, capacity, agent, report, governance, audit, about };

let state = load();
const root = document.getElementById('view');

function parseHash() {
  const [path, query = ''] = location.hash.replace(/^#\/?/, '').split('?');
  return { name: ROUTES[path] ? path : 'overview', params: Object.fromEntries(new URLSearchParams(query)) };
}

const analysis = () => analyse(state.portfolio);

function render({ keepFocus } = {}) {
  const { name, params } = parseHash();
  const view = ROUTES[name];
  const ctx = {
    state, a: analysis(), params, root,
    analyse: analysis,
    refresh: (o) => render(o),
    go: (h) => { location.hash = h; },
    replaceState: (s) => { state = s; render(); },
  };
  const y = window.scrollY;
  root.innerHTML = view.render(ctx);
  view.bind?.(ctx);
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === `#/${name}`));
  document.body.classList.remove('nav-open');
  const cycle = document.getElementById('cycle-status');
  cycle.textContent = state.cycle.status;
  cycle.className = 'cycle-status cs-' + state.cycle.status.replace(/\s/g, '-');
  if (keepFocus) {
    const el = root.querySelector(`[data-filter="${keepFocus}"]`);
    if (el) { el.focus(); if (el.setSelectionRange && el.type === 'search') el.setSelectionRange(el.value.length, el.value.length); }
    window.scrollTo(0, y);
  }
  save(state);
}

let lastRoute = '';
window.addEventListener('hashchange', () => {
  const { name } = parseHash();
  render();
  if (name !== lastRoute) window.scrollTo(0, 0);
  lastRoute = name;
});
document.getElementById('menu').addEventListener('click', () => document.body.classList.toggle('nav-open'));

// Theme toggle: system by default, remembered per browser.
const themeBtn = document.getElementById('theme');
const applyTheme = (t) => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
try { applyTheme(localStorage.getItem('aipo.theme')); } catch { /* ignore */ }
themeBtn.addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme === 'dark'
    || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  const next = dark ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('aipo.theme', next); } catch { /* ignore */ }
});

(async () => {
  if (!state.audit.length) await log(state, 'system', 'PORTFOLIO_LOADED', `${state.portfolio.initiatives.length} initiatives, period ${state.portfolio.period.label}`);
  lastRoute = parseHash().name;
  render();
})();
