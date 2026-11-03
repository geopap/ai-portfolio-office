import { esc, rag, call, trend, sev, pageHead, eur } from '../ui.js';
import { pct } from '../engine.js';
import { OBJECTIVES, PHASES, TIERS } from '../data.js';

const filters = { objective: '', phase: '', tier: '', status: '', q: '' };

export function render({ a, params, state }) {
  const list = a.items.filter((i) =>
    (!filters.objective || i.objective === filters.objective)
    && (!filters.phase || i.phase === filters.phase)
    && (!filters.tier || i.tier === filters.tier)
    && (!filters.status || i.status === filters.status)
    && (!filters.q || `${i.name} ${i.subtitle} ${i.id} ${i.owner}`.toLowerCase().includes(filters.q.toLowerCase())));

  const sel = (key, label, opts) => `<label>${label}<select data-filter="${key}"><option value="">All</option>${opts.map((o) => `<option ${filters[key] === o ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;

  const rows = list.map((i) => `
    <tr class="${params.id === i.id ? 'selected' : ''}" data-open="${esc(i.id)}" tabindex="0">
      <td><b>${esc(i.name)}</b><div class="muted small">${esc(i.id)} · ${esc(i.subtitle)}</div></td>
      <td>${esc(i.objective)}</td><td>${esc(i.tier)}</td><td>${esc(i.phase)}</td>
      <td class="c">${rag(i.rag.timing)}</td><td class="c">${rag(i.rag.cost)}</td><td class="c">${rag(i.rag.scope)}</td>
      <td class="r">${trend(i)}</td>
      <td class="r ${i.costVar > 0.1 ? 'neg' : ''}">${pct(i.costVar)}</td>
      <td class="r">${i.prio.score}</td>
      <td>${call(state.overrides[i.id]?.call || i.rec.call)}</td>
      <td class="c">${i.issues.length ? `<span class="issue-count" title="${esc(i.issues.map((x) => x.message).join('\n'))}">${i.issues.length}</span>` : ''}</td>
    </tr>`).join('');

  const detail = params.id ? detailPanel(a.items.find((i) => i.id === params.id), a, state) : '';

  return `
    ${pageHead('Curate the portfolio', 'Initiatives', 'Every initiative in one prioritised, business-cased list — grouped into group pilots, local rollouts and local projects so ownership is explicit.')}
    <div class="filters">
      <label class="grow">Search<input type="search" data-filter="q" value="${esc(filters.q)}" placeholder="Name, ID or owner"></label>
      ${sel('objective', 'Objective', OBJECTIVES)}${sel('phase', 'Phase', PHASES)}${sel('tier', 'Tier', TIERS)}
      <label>Status<select data-filter="status"><option value="">All</option>${['G', 'A', 'R'].map((s) => `<option value="${s}" ${filters.status === s ? 'selected' : ''}>${{ G: 'On track', A: 'At risk', R: 'Off track' }[s]}</option>`).join('')}</select></label>
    </div>
    <div class="card"><div class="table-wrap"><table class="table table-click">
      <thead><tr><th>Initiative</th><th>Objective</th><th>Tier</th><th>Phase</th><th class="c">Time</th><th class="c">Cost</th><th class="c">Scope</th><th class="r">Value vs plan</th><th class="r">Spend vs budget</th><th class="r">Priority</th><th>Gate call</th><th class="c">Issues</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="12" class="muted">No initiatives match the filters.</td></tr>'}</tbody>
    </table></div><p class="muted small pad">${list.length} of ${a.items.length} initiatives · select a row for details</p></div>
    ${detail}`;
}

function detailPanel(i, a, state) {
  if (!i) return '';
  const deps = a.dependencies;
  const up = (i.dependsOn || []).map((id) => a.items.find((x) => x.id === id)).filter(Boolean);
  const down = (deps.dependants[i.id] || []).map((id) => a.items.find((x) => x.id === id));
  const o = state.overrides[i.id];
  const link = (x) => `<a href="#/portfolio?id=${esc(x.id)}">${esc(x.name)}</a> ${rag(x.status)}`;
  return `
  <aside class="drawer" aria-label="Initiative details">
    <div class="drawer-head"><div><div class="kicker">${esc(i.id)} · ${esc(i.tier)} · ${esc(i.markets.join(', '))}</div><h2>${esc(i.name)} <span class="muted">— ${esc(i.subtitle)}</span></h2></div>
      <a class="btn ghost" href="#/portfolio" aria-label="Close">✕</a></div>
    <div class="drawer-grid">
      <div><h3>Status</h3><p>Timing ${rag(i.rag.timing)} Cost ${rag(i.rag.cost)} Scope ${rag(i.rag.scope)}</p>
        <p class="small muted">Owner ${esc(i.owner)} · Sponsor ${esc(i.sponsor)} · ${esc(i.phase)} for ${i.monthsInPhase} months · updated ${esc(i.lastUpdate)}</p>
        <h3>Latest update <span class="muted small">(owner's words, untrusted input)</span></h3>
        <blockquote>${esc(i.update || 'No update submitted.')}</blockquote></div>
      <div><h3>Business case</h3>
        <dl class="kv">
          <dt>Approved</dt><dd>${i.bc.approved ? 'Yes' : '<span class="neg">No</span>'}</dd>
          <dt>Net-sales uplift (3y)</dt><dd>€${i.bc.netSales.toFixed(1)}m</dd>
          <dt>EBITDA effect (3y)</dt><dd>€${i.bc.ebitda.toFixed(1)}m</dd>
          <dt>Payback</dt><dd>${i.bc.paybackMonths ? i.bc.paybackMonths + ' months' : '–'}</dd>
          <dt>Phase budget / spent</dt><dd>${eur(i.budget)} / ${eur(i.actuals)} <span class="${i.costVar > 0.1 ? 'neg' : 'muted'}">(${pct(i.costVar)})</span></dd>
          ${i.kpi ? `<dt>${esc(i.kpi.name)}</dt><dd>${i.kpi.actual} vs plan ${i.kpi.plan} ${trend(i)}</dd>` : ''}
          ${i.ebitdaYtd ? `<dt>EBITDA realised YTD</dt><dd>${eur(i.ebitdaYtd.actual)} vs ${eur(i.ebitdaYtd.plan)}</dd>` : ''}
        </dl></div>
      <div><h3>Stage-gate recommendation</h3><p>${call(i.rec.call)} <span class="small muted">rule <code>${esc(i.rec.rule)}</code></span></p>
        <p class="small">${esc(i.rec.why.join('; '))}.</p>
        ${o ? `<p class="override-note">Overridden to ${call(o.call)} by ${esc(o.by)}: ${esc(o.rationale)}</p>` : ''}
        <h3>Priority</h3><p><b>${i.prio.score}</b>/100 · ${esc(i.prio.quadrant)} <span class="small muted">fit ${i.scores.fit} · value ${i.scores.value} · effort ${i.scores.effort} · risk ${i.scores.risk}${i.mandatory ? ' · mandatory' : ''}</span></p></div>
      <div><h3>Dependencies</h3>
        <p class="small"><b>Needs:</b> ${up.map(link).join(', ') || '–'}</p>
        <p class="small"><b>Enables:</b> ${down.map(link).join(', ') || '–'}</p>
        <h3>Review findings</h3>
        ${i.issues.length ? `<ul class="issues">${i.issues.map((x) => `<li>${sev(x.severity)} ${esc(x.message)}</li>`).join('')}</ul>` : '<p class="small muted">No issues found.</p>'}
        ${i.aiSystem ? '<p class="small"><span class="tag">AI system</span> Listed in the AI inventory — see <a href="#/governance">Governance</a>.</p>' : ''}</div>
    </div>
  </aside>`;
}

export function bind({ root, refresh, go, params }) {
  if (params.id) requestAnimationFrame(() => root.querySelector('.drawer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  root.querySelectorAll('[data-filter]').forEach((el) => {
    el.addEventListener(el.tagName === 'INPUT' ? 'input' : 'change', () => {
      filters[el.dataset.filter] = el.value;
      refresh({ keepFocus: el.dataset.filter });
    });
  });
  root.querySelectorAll('[data-open]').forEach((tr) => {
    const open = () => go(`#/portfolio?id=${tr.dataset.open}`);
    tr.addEventListener('click', open);
    tr.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
  });
}
