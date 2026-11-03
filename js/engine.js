// Deterministic portfolio engine. Pure functions, no DOM, no network —
// the same input always gives the same flags, scores and recommendations.

import { RULES } from './rules.js';

const RAG_ORDER = { G: 0, A: 1, R: 2 };
const RAG_FROM = ['G', 'A', 'R'];

export function overallStatus(rag) {
  return RAG_FROM[Math.max(RAG_ORDER[rag.timing], RAG_ORDER[rag.cost], RAG_ORDER[rag.scope])];
}

export function valueVariance(it) {
  if (!it.kpi || !it.kpi.plan) return null;
  return (it.kpi.actual - it.kpi.plan) / it.kpi.plan;
}

export function costVariance(it) {
  if (!it.budget) return null;
  return (it.actuals - it.budget) / it.budget;
}

export function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

export function valueTrend(v, rules = RULES) {
  if (v === null) return 'none';
  if (v <= rules.value.behind) return 'behind';
  if (v >= rules.value.ahead) return 'ahead';
  return 'on plan';
}

// ── Review: the checks the agent runs on every report before consolidating ──
export function reviewInitiative(it, asOf, rules = RULES) {
  const issues = [];
  const add = (severity, code, message) => issues.push({ id: it.id, severity, code, message });
  const cv = costVariance(it);

  if (!it.submitted) add('high', 'MISSING_REPORT', 'No status report received for this period — chased automatically.');
  if (it.submitted && !it.update?.trim()) add('medium', 'EMPTY_UPDATE', 'Report submitted without a written update.');

  const age = daysBetween(it.lastUpdate, asOf);
  if (age > rules.staleAfterDays) add('medium', 'STALE', `Last update is ${age} days old (limit ${rules.staleAfterDays}).`);

  if (cv !== null && cv > rules.cost.overrun && it.rag.cost === 'G') {
    add('high', 'RAG_MISMATCH', `Cost reported green, but finance actuals are ${pct(cv)} over the phase budget.`);
  }
  const vv = valueVariance(it);
  if (vv !== null && vv <= rules.gate.revise.valueBelow && overallStatus(it.rag) === 'G') {
    add('high', 'RAG_MISMATCH', `Reported green overall, but the value KPI is ${pct(vv)} vs plan.`);
  }

  const pastIdeate = it.phase !== 'Ideate';
  if (pastIdeate && it.phase !== 'Explore' && !it.bc?.approved) {
    add('high', 'NO_BUSINESS_CASE', `In ${it.phase} without an approved business case.`);
  }
  if (it.phase === 'Explore' && !it.bc?.approved && it.monthsInPhase > rules.gate.stop.maxMonthsWithoutCase) {
    add('medium', 'NO_BUSINESS_CASE', `${it.monthsInPhase} months in Explore without a business case.`);
  }
  if (it.gateOverdueDays) add('high', 'GATE_OVERDUE', `Stage-gate decision ${it.gateOverdueDays} days overdue.`);

  if (it.update && rules.injectionPatterns.some((re) => re.test(it.update))) {
    add('high', 'PROMPT_INJECTION', 'Update contains instruction-like text aimed at an AI system. Treated as data, not obeyed — please review the source.');
  }
  return issues;
}

// ── Stage-gate recommendation: SCALE / CONTINUE / REVISE / STOP ──
export function recommend(it, rules = RULES) {
  const status = overallStatus(it.rag);
  const vv = valueVariance(it);
  const cv = costVariance(it);
  const g = rules.gate;
  const why = [];

  const noCaseTooLong = it.phase !== 'Ideate' && !it.bc?.approved && it.monthsInPhase > g.stop.maxMonthsWithoutCase;
  if (vv !== null && vv <= g.stop.valueBelow) {
    why.push(`value KPI ${pct(vv)} vs plan — the business case no longer holds`);
    return { call: 'STOP', why, rule: 'gate.stop.valueBelow' };
  }
  if (it.phase !== 'Ideate' && it.scores.fit <= g.stop.minFitForContinuation && noCaseTooLong) {
    why.push(`low strategic fit (${it.scores.fit}/5) and ${it.monthsInPhase} months without a business case`);
    return { call: 'STOP', why, rule: 'gate.stop.minFitForContinuation' };
  }

  if (status === 'R') why.push('off track on ' + offTrackDims(it.rag).join(' & '));
  if (vv !== null && vv <= g.revise.valueBelow) why.push(`value KPI ${pct(vv)} vs plan`);
  if (cv !== null && cv > rules.cost.severeOverrun) why.push(`spend ${pct(cv)} over phase budget`);
  if (why.length) return { call: 'REVISE', why, rule: 'gate.revise' };

  if (status === 'G' && vv !== null && vv >= g.scale.valueAbove && g.scale.phases.includes(it.phase)) {
    why.push(`green on time, cost and scope; value KPI ${pct(vv)} ahead of plan`);
    return { call: 'SCALE', why, rule: 'gate.scale' };
  }

  why.push(status === 'G' ? 'on track — release the next phase' : 'manageable deviations — continue with owner actions');
  return { call: 'CONTINUE', why, rule: 'gate.continue' };
}

function offTrackDims(rag) {
  return Object.entries(rag).filter(([, v]) => v === 'R').map(([k]) => k);
}

// ── Prioritisation: one comparable score and an impact / effort quadrant ──
export function priority(it, rules = RULES) {
  const w = rules.priority.weights;
  const s = it.scores;
  const raw = w.fit * s.fit + w.value * s.value + w.effort * (6 - s.effort) + w.risk * (6 - s.risk);
  let score = Math.round(((raw - 1) / 4) * 100);
  if (it.mandatory) score = Math.max(score, rules.priority.mandatoryFloor);
  const impact = (s.fit + s.value) / 2;
  const effort = (s.effort + s.risk) / 2;
  const hi = impact >= rules.priority.impactThreshold;
  const lo = effort < rules.priority.effortThreshold;
  const quadrant = hi && lo ? 'Quick win' : hi ? 'Big bet' : lo ? 'Fill-in' : 'Question';
  return { score, impact, effort, quadrant };
}

// ── Capacity: demand vs. available FTE per skill area and quarter ──
export function capacityMatrix(initiatives, capacity, quarters, rules = RULES) {
  const rows = Object.keys(capacity).map((skill) => {
    const cells = quarters.map((q, qi) => {
      const contributors = initiatives
        .map((it) => ({ id: it.id, fte: it.demand?.[skill]?.[qi] || 0 }))
        .filter((c) => c.fte > 0)
        .sort((a, b) => b.fte - a.fte);
      const demand = contributors.reduce((s, c) => s + c.fte, 0);
      const load = demand / capacity[skill];
      const band = load > rules.capacity.overCommitted ? 'over' : load >= rules.capacity.atCapacity ? 'at' : 'under';
      return { quarter: q, demand, load, band, contributors };
    });
    return { skill, capacity: capacity[skill], cells };
  });
  const hotspots = rows
    .flatMap((r) => r.cells.filter((c) => c.band === 'over').map((c) => ({ skill: r.skill, ...c })))
    .sort((a, b) => b.load - a.load);
  return { rows, hotspots };
}

// ── Dependencies: bottlenecks and dependencies put at risk by a struggling upstream ──
export function dependencyAnalysis(initiatives, rules = RULES) {
  const byId = Object.fromEntries(initiatives.map((i) => [i.id, i]));
  const edges = [];
  const broken = [];
  for (const it of initiatives) {
    for (const up of it.dependsOn || []) {
      if (!byId[up]) { broken.push({ from: up, to: it.id, reason: 'unknown initiative' }); continue; }
      edges.push({ from: up, to: it.id });
    }
  }
  const dependants = {};
  for (const e of edges) (dependants[e.from] ||= []).push(e.to);

  const bottlenecks = Object.entries(dependants)
    .filter(([, list]) => list.length >= rules.bottleneckDependants)
    .map(([id, list]) => ({ id, dependants: list, status: overallStatus(byId[id].rag) }))
    .sort((a, b) => b.dependants.length - a.dependants.length);

  const atRisk = edges
    .filter((e) => byId[e.from].rag.timing !== 'G')
    .map((e) => ({ ...e, upstreamTiming: byId[e.from].rag.timing }));

  return { edges, dependants, bottlenecks, atRisk, broken, cycles: findCycles(initiatives) };
}

function findCycles(initiatives) {
  const graph = Object.fromEntries(initiatives.map((i) => [i.id, i.dependsOn || []]));
  const state = {};
  const cycles = [];
  const visit = (id, path) => {
    if (state[id] === 1) { cycles.push([...path.slice(path.indexOf(id)), id]); return; }
    if (state[id] === 2 || !graph[id]) return;
    state[id] = 1;
    for (const up of graph[id]) visit(up, [...path, id]);
    state[id] = 2;
  };
  Object.keys(graph).forEach((id) => visit(id, []));
  return cycles;
}

// ── Exceptions: what genuinely needs leadership attention, ranked by urgency ──
// Data-quality issues (missing, stale, injection) go to the review queue, not the exec report.
const BUSINESS_ISSUES = ['RAG_MISMATCH', 'GATE_OVERDUE', 'NO_BUSINESS_CASE'];

function urgency(it, issues, rules) {
  const vv = valueVariance(it);
  const cv = costVariance(it);
  let u = { G: 0, A: 2, R: 5 }[overallStatus(it.rag)];
  if (vv !== null && vv <= rules.value.behind) u += 2 + Math.min(4, Math.round(-vv * 10));
  if (cv !== null && cv > rules.cost.overrun) u += 3;
  for (const i of issues) {
    if (BUSINESS_ISSUES.includes(i.code)) u += i.severity === 'high' ? 3 : 1;
  }
  return u;
}

// ── Full analysis of a portfolio snapshot ──
export function analyse(portfolio, rules = RULES) {
  const { initiatives, capacity, quarters, period } = portfolio;
  const items = initiatives.map((it) => {
    const issues = reviewInitiative(it, period.asOf, rules);
    return {
      ...it,
      status: overallStatus(it.rag),
      valueVar: valueVariance(it),
      costVar: costVariance(it),
      trend: valueTrend(valueVariance(it), rules),
      issues,
      rec: recommend(it, rules),
      prio: priority(it, rules),
      urgency: urgency(it, issues, rules),
    };
  });

  const onTrack = items.filter((i) => i.status === 'G' && i.trend !== 'behind').length;
  const offTrack = items.filter((i) => i.status === 'R').length;
  const attention = items.length - onTrack - offTrack;

  const exceptions = items
    .filter((i) => i.urgency >= 3)
    .sort((a, b) => b.urgency - a.urgency)
    .slice(0, rules.topExceptions);

  const decisionOrder = { STOP: 0, SCALE: 1, REVISE: 2, CONTINUE: 3 };
  const decisions = items
    .filter((i) => i.rec.call !== 'CONTINUE')
    .sort((a, b) => decisionOrder[a.rec.call] - decisionOrder[b.rec.call] || b.urgency - a.urgency)
    .slice(0, rules.topDecisions);

  const issues = items.flatMap((i) => i.issues);
  const cap = capacityMatrix(initiatives, capacity, quarters, rules);
  const deps = dependencyAnalysis(initiatives, rules);

  const realising = items.filter((i) => i.ebitdaYtd);
  const ebitdaPlan = sum(realising.map((i) => i.ebitdaYtd.plan));
  const ebitdaActual = sum(realising.map((i) => i.ebitdaYtd.actual));
  const budget = sum(items.map((i) => i.budget));
  const actuals = sum(items.map((i) => i.actuals));

  const required = items.length;
  const complete = items.filter((i) => i.submitted && i.update?.trim()).length;

  return {
    period,
    items,
    stats: {
      total: items.length, onTrack, attention, offTrack,
      decisionsRequired: decisions.length,
      onTrackPct: onTrack / items.length,
      ebitdaPlan, ebitdaActual, benefitsRealisation: ebitdaPlan ? ebitdaActual / ebitdaPlan : null,
      budget, actuals,
      businessCaseNs: sum(items.filter((i) => i.bc?.approved).map((i) => i.bc.netSales)),
      businessCaseEbitda: sum(items.filter((i) => i.bc?.approved).map((i) => i.bc.ebitda)),
      completeness: complete / required,
      peakLoad: Math.max(...cap.rows.flatMap((r) => r.cells.map((c) => c.load))),
      highIssues: issues.filter((i) => i.severity === 'high').length,
    },
    exceptions, decisions, issues, capacity: cap, dependencies: deps,
    rulesVersion: rules.version,
  };
}

export const sum = (xs) => xs.reduce((s, x) => s + (x || 0), 0);
export function pct(x, digits = 0) {
  if (x === null || x === undefined) return '–';
  const v = (x * 100).toFixed(digits);
  return (x > 0 ? '+' : '') + v + '%';
}
