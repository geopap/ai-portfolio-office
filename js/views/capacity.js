import { esc, section, pageHead } from '../ui.js';
import { RULES } from '../rules.js';

export function render({ a, state }) {
  const { rows, hotspots } = a.capacity;
  const quarters = state.portfolio.quarters;
  const name = (id) => a.items.find((i) => i.id === id)?.name || id;

  const body = rows.map((r) => `<tr><th scope="row">${esc(r.skill)}<div class="muted small">${r.capacity} FTE available</div></th>
    ${r.cells.map((c) => `<td class="heat heat-${c.band}" title="${esc(c.contributors.map((x) => `${name(x.id)}: ${x.fte} FTE`).join('\n'))}">
      <b>${Math.round(c.load * 100)}%</b><span>${c.demand} FTE</span></td>`).join('')}</tr>`).join('');

  const risks = hotspots.slice(0, 4).map((h) => {
    const top = h.contributors.slice(0, 3).map((x) => name(x.id));
    return `<li class="flag"><div class="flag-head"><span class="sev sev-${h.load > 1.25 ? 'high' : 'medium'}">${h.load > 1.25 ? 'high' : 'medium'}</span> <b>${esc(h.skill)} at ${Math.round(h.load * 100)}% in ${esc(h.quarter)}</b></div>
      <div class="flag-body">${esc(top.join(', '))} peak together. Option: sequence the lowest-priority of these to start after the peak, or move ${Math.ceil(h.demand - rows.find((r) => r.skill === h.skill).capacity)} FTE of demand to a later quarter.</div></li>`;
  }).join('');

  return `
    ${pageHead('Capacity, not just plans', 'Capacity & delivery risk', 'Demand from every initiative rolled into one view against available people per skill area (100% = a team fully loaded), so over-commitment is resolved in planning.')}
    ${section('Load by skill area — demand vs capacity', `<div class="table-wrap"><table class="table heatmap"><thead><tr><th>Skill area</th>${quarters.map((q) => `<th class="c">${esc(q)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>
      <div class="legend"><span><i class="sw heat-under"></i>Under capacity (&lt;${Math.round(RULES.capacity.atCapacity * 100)}%)</span><span><i class="sw heat-at"></i>At capacity</span><span><i class="sw heat-over"></i>Over-committed (&gt;${Math.round(RULES.capacity.overCommitted * 100)}%)</span><span class="muted">Hover a cell for contributing initiatives</span></div>`)}
    <div class="grid-2">
      ${section('Top delivery risks', `<ul class="flags">${risks || '<li class="muted">No over-committed skill areas.</li>'}</ul>`)}
      ${section('What this needs', `<p>A lightweight capacity capture: FTE per initiative by skill area, refreshed at each review. After a one-off setup owned by the PMO, the agent maintains this view and flags new peaks automatically.</p>
        <p class="small muted">Capacity figures are synthetic. The PMO itself is staffed through internal moves — no new headcount — which is why the automation matters.</p>`)}
    </div>`;
}
