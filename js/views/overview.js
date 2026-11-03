import { esc, rag, call, trend, tile, section, pageHead, eur } from '../ui.js';
import { pct } from '../engine.js';

export function render({ state, a }) {
  const s = a.stats;
  const c = state.portfolio.company;
  const cycle = state.cycle.status;
  const banner = cycle === 'approved'
    ? `<div class="banner ok">✓ ${esc(a.period.label)} pack signed off by ${esc(state.cycle.reviewer)} — ready for the CEO &amp; CFO.</div>`
    : `<div class="banner">The ${esc(a.period.label)} cycle is <b>${esc(cycle)}</b>. <a href="#/agent">Run the PMO agent →</a></div>`;

  const exceptions = a.exceptions.map((i) => `
    <li class="flag">
      <div class="flag-head">${rag(i.status)} <a href="#/portfolio?id=${esc(i.id)}"><b>${esc(i.name)}</b></a> <span class="muted">${esc(i.id)} · ${esc(i.owner)}</span></div>
      <div class="flag-body">${esc(flagText(i))}</div>
    </li>`).join('');

  const decisions = a.decisions.map((i) => {
    const o = state.overrides[i.id];
    return `<li class="decision">${call(o ? o.call : i.rec.call)} <b>${esc(i.name)}</b>
      <div class="flag-body">${esc(i.rec.why.join('; '))}${o ? ` <span class="override-note">Human override of ${esc(i.rec.call)}: ${esc(o.rationale)}</span>` : ''}</div></li>`;
  }).join('');

  const byObjective = ['Growth', 'Operational excellence', 'Cost savings'].map((obj) => {
    const list = a.items.filter((i) => i.objective === obj);
    const counts = { G: 0, A: 0, R: 0 };
    list.forEach((i) => counts[i.status]++);
    const total = list.length || 1;
    return `<div class="obj-row"><div class="obj-name">${esc(obj)} <span class="muted">${list.length}</span></div>
      <div class="stack" role="img" aria-label="${counts.G} on track, ${counts.A} at risk, ${counts.R} off track">
        ${['G', 'A', 'R'].map((k) => counts[k] ? `<span class="stack-${k}" style="flex:${counts[k] / total}">${counts[k]}</span>` : '').join('')}
      </div></div>`;
  }).join('');

  const top = a.items.slice().sort((x, y) => y.urgency - x.urgency).slice(0, 8).map((i) => `
    <tr><td><a href="#/portfolio?id=${esc(i.id)}">${esc(i.name)}</a><div class="muted small">${esc(i.subtitle)}</div></td>
    <td>${esc(i.phase)}</td><td class="c">${rag(i.rag.timing)}</td><td class="c">${rag(i.rag.cost)}</td><td class="c">${rag(i.rag.scope)}</td><td class="r">${trend(i)}</td></tr>`).join('');

  return `
    ${pageHead(`${c.name} · ${c.tagline}`, `Portfolio overview — ${a.period.label}`,
      'One comparable view of every strategic initiative: status, value against the business case, and the decisions leadership needs to take.')}
    ${banner}
    <div class="tiles">
      ${tile('initiatives tracked', s.total)}
      ${tile('on track', s.onTrack, `${Math.round(s.onTrackPct * 100)}% of portfolio`, 'good')}
      ${tile('need attention', s.attention, '', 'warn')}
      ${tile('off track', s.offTrack, '', 'bad')}
      ${tile('EBITDA realised YTD', eur(s.ebitdaActual), `plan ${eur(s.ebitdaPlan)} · ${pct(s.benefitsRealisation - 1)}`)}
      ${tile('decisions required', s.decisionsRequired, 'for the CEO &amp; CFO')}
    </div>
    <div class="grid-2">
      ${section('Needs attention', `<ul class="flags">${exceptions}</ul>`, '<a class="small" href="#/agent">Review queue →</a>')}
      ${section('Decisions for the CEO & CFO', `<ul class="flags">${decisions}</ul>`, '<a class="small" href="#/prioritise">Prioritisation →</a>')}
    </div>
    <div class="grid-2">
      ${section('Highest-urgency initiatives', `<div class="table-wrap"><table class="table"><thead><tr><th>Initiative</th><th>Phase</th><th class="c">Time</th><th class="c">Cost</th><th class="c">Scope</th><th class="r">Value vs plan</th></tr></thead><tbody>${top}</tbody></table></div>`, '<a class="small" href="#/portfolio">All initiatives →</a>')}
      ${section('Status by strategic objective', `${byObjective}
        <div class="legend"><span><i class="sw sw-G"></i>On track</span><span><i class="sw sw-A"></i>At risk</span><span><i class="sw sw-R"></i>Off track</span></div>
        <div class="mini-kpis">
          <div><b>${eur(s.budget)}</b><span>phase budgets</span></div>
          <div><b>${eur(s.actuals)}</b><span>spent to date</span></div>
          <div><b>€${s.businessCaseNs.toFixed(1)}m</b><span>net-sales uplift in approved cases (3y)</span></div>
          <div><b>${Math.round(s.peakLoad * 100)}%</b><span>peak capacity load</span></div>
        </div>`)}
    </div>`;
}

export function flagText(i) {
  const bits = [];
  const mismatch = i.issues.find((x) => x.code === 'RAG_MISMATCH');
  const gate = i.issues.find((x) => x.code === 'GATE_OVERDUE');
  if (i.valueVar !== null && i.trend === 'behind') bits.push(`${i.kpi.name} ${pct(i.valueVar)} vs plan`);
  if (i.costVar !== null && i.costVar > 0.1) bits.push(`spend ${pct(i.costVar)} over phase budget`);
  if (mismatch) bits.push(mismatch.message);
  if (gate) bits.push(gate.message);
  if (!bits.length && i.update) bits.push(i.update);
  return bits.join(' · ');
}
