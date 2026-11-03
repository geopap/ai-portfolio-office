// Template-based executive summary — the default when no AI model is connected.
// Every sentence is assembled from engine output, so every figure is traceable.

import { pct } from './engine.js';

const short = (i) => `${i.name} [${i.id}]`;

export function templateNarrative(a) {
  const s = a.stats;
  const p1 = `${s.onTrack} of ${s.total} initiatives are on track in ${a.period.label}, ${s.attention} need attention and ${s.offTrack} are off track. `
    + `Realised EBITDA benefits stand at EUR ${fmtK(s.ebitdaActual)} year to date against a plan of EUR ${fmtK(s.ebitdaPlan)} (${pct(s.benefitsRealisation - 1)}).`;

  const ex = a.exceptions.map((i) => {
    const bits = [];
    if (i.status === 'R') bits.push('off track');
    if (i.valueVar !== null && i.trend === 'behind') bits.push(`value ${pct(i.valueVar)} vs plan`);
    if (i.costVar !== null && i.costVar > 0.1) bits.push(`spend ${pct(i.costVar)} over budget`);
    const mismatch = i.issues.find((x) => x.code === 'RAG_MISMATCH');
    if (mismatch) bits.push('self-reported status contradicts finance actuals');
    const gate = i.issues.find((x) => x.code === 'GATE_OVERDUE');
    if (gate) bits.push(gate.message.toLowerCase().replace(/\.$/, ''));
    return `${short(i)}: ${bits.join(', ') || 'amber with open actions'}`;
  });
  const hot = a.capacity.hotspots[0];
  const bn = a.dependencies.bottlenecks[0];
  const p2 = `Needs attention — ${ex.join('; ')}.`
    + (bn ? ` ${a.items.find((i) => i.id === bn.id).name} [${bn.id}] is the critical-path bottleneck with ${bn.dependants.length} dependent initiatives.` : '')
    + (hot ? ` ${hot.skill} capacity peaks at ${Math.round(hot.load * 100)}% in ${hot.quarter}.` : '');

  const dec = a.decisions.map((i) => `${i.rec.call} ${short(i)} — ${i.rec.why[0]}`);
  const p3 = dec.length ? `Decisions requested: ${dec.join('; ')}.` : 'No stage-gate decisions are required this period.';

  return [p1, p2, p3].join('\n\n');
}

export function fmtK(k) {
  return k >= 1000 ? `${(k / 1000).toFixed(1)}m` : `${Math.round(k)}k`;
}
