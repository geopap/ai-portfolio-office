import { esc, call, section, pageHead, rag } from '../ui.js';
import { RULES } from '../rules.js';

export function render({ a, state }) {
  const W = 560, H = 420, P = 44;
  const x = (e) => P + ((e - 1) / 4) * (W - 2 * P);
  const y = (i) => H - P - ((i - 1) / 4) * (H - 2 * P);
  const seen = {};
  const dots = a.items.map((it) => {
    const key = `${it.prio.effort}|${it.prio.impact}`;
    const n = (seen[key] = (seen[key] || 0) + 1) - 1;
    const angle = n * 2.4, r = n ? 14 + n * 3 : 0;
    const cx = x(it.prio.effort) + Math.cos(angle) * r, cy = y(it.prio.impact) + Math.sin(angle) * r;
    return `<g class="dot dot-${it.status}"><title>${esc(it.name)} — ${esc(it.prio.quadrant)}, score ${it.prio.score}</title>
      <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(7 + Math.sqrt(it.budget) / 9).toFixed(1)}"/>
      <text x="${cx.toFixed(1)}" y="${(cy - 12 - Math.sqrt(it.budget) / 9).toFixed(1)}" text-anchor="middle">${esc(it.id)}</text></g>`;
  }).join('');
  const tx = x(RULES.priority.effortThreshold), ty = y(RULES.priority.impactThreshold);
  const svg = `<svg class="matrix" viewBox="0 0 ${W} ${H}" role="img" aria-label="Impact versus effort matrix">
    <rect class="q q-big" x="${tx}" y="${P}" width="${W - P - tx}" height="${ty - P}"/>
    <rect class="q q-quick" x="${P}" y="${P}" width="${tx - P}" height="${ty - P}"/>
    <rect class="q q-fill" x="${P}" y="${ty}" width="${tx - P}" height="${H - P - ty}"/>
    <rect class="q q-question" x="${tx}" y="${ty}" width="${W - P - tx}" height="${H - P - ty}"/>
    <text class="q-label" x="${P + 8}" y="${P + 18}">QUICK WINS · do now</text>
    <text class="q-label" x="${W - P - 8}" y="${P + 18}" text-anchor="end">BIG BETS · fund &amp; sequence</text>
    <text class="q-label" x="${P + 8}" y="${H - P - 10}">FILL-INS · if capacity allows</text>
    <text class="q-label" x="${W - P - 8}" y="${H - P - 10}" text-anchor="end">QUESTION · challenge / defer</text>
    <line class="axis" x1="${P}" y1="${H - P}" x2="${W - P}" y2="${H - P}"/><line class="axis" x1="${P}" y1="${P}" x2="${P}" y2="${H - P}"/>
    <text class="axis-label" x="${W / 2}" y="${H - 12}" text-anchor="middle">Effort &amp; risk →</text>
    <text class="axis-label" x="14" y="${H / 2}" text-anchor="middle" transform="rotate(-90 14 ${H / 2})">Impact (fit &amp; value) →</text>
    ${dots}</svg>`;

  const ranked = a.items.slice().sort((p, q) => q.prio.score - p.prio.score).map((it, n) => `
    <tr><td class="r muted">${n + 1}</td><td><a href="#/portfolio?id=${esc(it.id)}">${esc(it.name)}</a>${it.mandatory ? ' <span class="tag">mandatory</span>' : ''}</td>
      <td><div class="score"><span style="width:${it.prio.score}%"></span></div></td><td class="r"><b>${it.prio.score}</b></td>
      <td>${esc(it.prio.quadrant)}</td><td>${rag(it.status)}</td><td>${call(state.overrides[it.id]?.call || it.rec.call)}</td></tr>`).join('');

  const w = RULES.priority.weights;
  return `
    ${pageHead('Choosing what wins', 'Prioritisation', 'Objective prioritisation, not the loudest voice — every initiative scored on the same four dimensions and placed on one impact / effort view.')}
    <div class="grid-2 wide-left">
      ${section('Impact vs effort', `${svg}<p class="small muted">Bubble size = phase budget · colour = overall status · thresholds from <code>rules.js</code></p>`)}
      ${section('How the score works', `
        <dl class="kv">
          <dt>Strategic fit</dt><dd>${w.fit * 100}% — alignment with the group strategy</dd>
          <dt>Value</dt><dd>${w.value * 100}% — net-sales, EBITDA and operational impact</dd>
          <dt>Effort &amp; resources</dt><dd>${w.effort * 100}% — inverted: people, budget, management bandwidth</dd>
          <dt>Risk &amp; readiness</dt><dd>${w.risk * 100}% — inverted: delivery risk and dependencies</dd>
        </dl>
        <p class="small">Score = weighted 1–5 ratings rescaled to 0–100. Mandatory (regulatory) initiatives have a floor of ${RULES.priority.mandatoryFloor}. The score informs the conversation — the CEO &amp; CFO make the call.</p>
        <h3>Stage-gate calls</h3>
        <ul class="calls-legend">
          <li>${call('SCALE')} proven — invest more, accelerate</li>
          <li>${call('CONTINUE')} on track — release the next phase</li>
          <li>${call('REVISE')} off track — fix scope, cost or plan</li>
          <li>${call('STOP')} case no longer holds — free the resources</li>
        </ul>`)}
    </div>
    ${section('Ranked portfolio', `<div class="table-wrap"><table class="table"><thead><tr><th class="r">#</th><th>Initiative</th><th>Score</th><th></th><th>Quadrant</th><th>Status</th><th>Gate call</th></tr></thead><tbody>${ranked}</tbody></table></div>`)}`;
}
