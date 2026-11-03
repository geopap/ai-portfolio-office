import { esc, rag, call, trend, eur } from '../ui.js';
import { pct } from '../engine.js';
import { templateNarrative } from '../narrative.js';
import { flagText } from './overview.js';

export function render({ state, a }) {
  const s = a.stats;
  const approved = state.cycle.status === 'approved';
  const n = state.narrative || { source: 'rules', text: templateNarrative(a) };
  const rows = a.items.slice().sort((x, y) => y.prio.score - x.prio.score).map((i) => `
    <tr><td>${esc(i.name)} <span class="muted">— ${esc(i.subtitle)}</span></td><td>${esc(i.phase)}</td>
    <td class="c">${rag(i.rag.timing)}</td><td class="c">${rag(i.rag.cost)}</td><td class="c">${rag(i.rag.scope)}</td><td class="r">${trend(i)}</td></tr>`).join('');

  return `
    <div class="report-actions no-print">
      <a class="btn ghost" href="#/agent">← Agent cycle</a>
      <button class="btn primary" id="print">Print / save as PDF</button>
      ${approved ? '' : '<span class="pill warn">Draft — not yet signed off</span>'}
    </div>
    <article class="report ${approved ? '' : 'is-draft'}">
      <header class="report-head">
        <div><div class="kicker">${esc(state.portfolio.company.name)} · Strategic Portfolio Office</div>
          <h1>Portfolio Monthly Report</h1>
          <p class="muted">Reporting period ${esc(a.period.label)} · prepared by the PMO agent, ${approved ? `signed off by ${esc(state.cycle.reviewer)}` : 'awaiting human sign-off'}</p></div>
        <div class="report-badge">${approved ? 'APPROVED' : 'DRAFT'}</div>
      </header>
      <div class="report-tiles">
        <div><b>${s.total}</b><span>initiatives</span></div><div class="good"><b>${s.onTrack}</b><span>on track</span></div>
        <div class="warn"><b>${s.attention}</b><span>need attention</span></div><div class="bad"><b>${s.offTrack}</b><span>off track</span></div>
        <div><b>${eur(s.ebitdaActual)}</b><span>EBITDA realised YTD (${pct(s.benefitsRealisation - 1)} vs plan)</span></div>
      </div>
      <section><h2>Executive summary ${n.source === 'ai' ? '<span class="tag tag-ai">AI-drafted, human-reviewed</span>' : ''}</h2>${n.text.split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}</section>
      <div class="report-cols">
        <section><h2>Needs attention</h2><ul class="flags">${a.exceptions.map((i) => `<li class="flag">${rag(i.status)} <b>${esc(i.name)}</b> — ${esc(flagText(i))} <span class="muted">Owner: ${esc(i.owner)}</span></li>`).join('')}</ul></section>
        <section><h2>Decisions for the CEO &amp; CFO</h2><ul class="flags">${a.decisions.map((i) => {
          const o = state.overrides[i.id];
          return `<li class="decision">${call(o ? o.call : i.rec.call)} <b>${esc(i.name)}</b> — ${esc(o ? o.rationale : i.rec.why.join('; '))}${o ? ` <span class="muted">(PMO override of ${esc(i.rec.call)})</span>` : ''}</li>`;
        }).join('')}</ul></section>
      </div>
      <section><h2>Portfolio status</h2><table class="table compact"><thead><tr><th>Initiative</th><th>Phase</th><th class="c">Time</th><th class="c">Cost</th><th class="c">Scope</th><th class="r">Value vs plan</th></tr></thead><tbody>${rows}</tbody></table></section>
      <footer class="report-foot">
        <p><b>How this was produced.</b> The PMO agent collected the owners' status updates, cross-checked them against finance actuals and KPI data, applied portfolio rules v${esc(a.rulesVersion)} and drafted this report. ${n.source === 'ai' ? 'The summary was drafted by an AI model from pseudonymised facts and checked for ungrounded figures. ' : ''}A person reviewed and signed off before circulation — the agent prepares, a person decides. Full trail: audit log entries ${state.audit.length ? `1–${state.audit.length}` : '–'}.</p>
        <p class="muted">Synthetic demonstration data · ${esc(state.portfolio.company.name)} is a fictional company.</p>
      </footer>
    </article>`;
}

export function bind({ root }) {
  root.querySelector('#print').addEventListener('click', () => window.print());
}
