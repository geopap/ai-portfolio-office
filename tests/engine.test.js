import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyse, overallStatus, recommend, priority, reviewInitiative, dependencyAnalysis, capacityMatrix } from '../js/engine.js';
import { INITIATIVES, CAPACITY, QUARTERS, PERIOD } from '../js/data.js';
import { RULES } from '../js/rules.js';

const portfolio = { initiatives: INITIATIVES, capacity: CAPACITY, quarters: QUARTERS, period: PERIOD };
const a = analyse(portfolio);
const item = (id) => a.items.find((i) => i.id === id);
const base = INITIATIVES.find((i) => i.id === 'PRO-07');
const variant = (patch) => ({ ...structuredClone(base), ...patch });

test('overall status is the worst of timing, cost and scope', () => {
  assert.equal(overallStatus({ timing: 'G', cost: 'G', scope: 'G' }), 'G');
  assert.equal(overallStatus({ timing: 'G', cost: 'A', scope: 'G' }), 'A');
  assert.equal(overallStatus({ timing: 'A', cost: 'G', scope: 'R' }), 'R');
});

test('portfolio stats add up', () => {
  const s = a.stats;
  assert.equal(s.total, INITIATIVES.length);
  assert.equal(s.onTrack + s.attention + s.offTrack, s.total);
});

test('SCALE when green and clearly ahead of plan in delivery', () => {
  assert.equal(item('LG-01').rec.call, 'SCALE');
  assert.equal(recommend(variant({ phase: 'Explore', kpi: { name: 'x', plan: 100, actual: 120 } })).call, 'CONTINUE');
});

test('STOP when the value case no longer holds', () => {
  assert.equal(recommend(variant({ kpi: { name: 'x', plan: 100, actual: 50 } })).call, 'STOP');
});

test('STOP for low fit with no business case for too long', () => {
  assert.equal(item('VRS-15').rec.call, 'STOP');
  assert.equal(recommend(variant({ phase: 'Explore', scores: { ...base.scores, fit: 2 }, bc: { approved: false }, monthsInPhase: 3 })).call, 'CONTINUE');
});

test('REVISE for red status, value shortfall or severe overrun', () => {
  assert.equal(item('ERP-03').rec.call, 'REVISE');
  assert.equal(item('NOR-09').rec.call, 'REVISE');
  assert.equal(item('SSC-08').rec.call, 'REVISE');
});

test('review catches a green cost status that contradicts finance actuals', () => {
  assert.ok(item('SSC-08').issues.some((i) => i.code === 'RAG_MISMATCH'));
  assert.ok(!item('PRO-07').issues.some((i) => i.code === 'RAG_MISMATCH'));
});

test('review flags missing, stale and prompt-injection content', () => {
  assert.ok(item('PRT-14').issues.some((i) => i.code === 'MISSING_REPORT'));
  const wha = item('WHA-16').issues.map((i) => i.code);
  assert.ok(wha.includes('STALE'));
  assert.ok(wha.includes('PROMPT_INJECTION'));
  const clean = reviewInitiative(variant({ update: 'Savings booked.' }), PERIOD.asOf);
  assert.ok(!clean.some((i) => i.code === 'PROMPT_INJECTION'));
});

test('review requires a business case from Develop onward', () => {
  const issues = reviewInitiative(variant({ phase: 'Develop', bc: { approved: false } }), PERIOD.asOf);
  assert.ok(issues.some((i) => i.code === 'NO_BUSINESS_CASE'));
});

test('exceptions are ranked by urgency and capped', () => {
  assert.ok(a.exceptions.length <= RULES.topExceptions);
  assert.equal(a.exceptions[0].id, 'NOR-09');
  for (let i = 1; i < a.exceptions.length; i++) assert.ok(a.exceptions[i - 1].urgency >= a.exceptions[i].urgency);
});

test('priority score is 0–100 and mandatory items get a floor', () => {
  for (const i of a.items) assert.ok(i.prio.score >= 0 && i.prio.score <= 100);
  assert.ok(item('CSR-11').prio.score >= RULES.priority.mandatoryFloor);
  assert.equal(priority(variant({ scores: { fit: 5, value: 5, effort: 1, risk: 1 } })).score, 100);
  assert.equal(priority(variant({ scores: { fit: 5, value: 5, effort: 1, risk: 1 } })).quadrant, 'Quick win');
  assert.equal(priority(variant({ scores: { fit: 1, value: 1, effort: 5, risk: 5 } })).quadrant, 'Question');
});

test('capacity matrix finds the Digital & IT peak', () => {
  const { rows, hotspots } = capacityMatrix(INITIATIVES, CAPACITY, QUARTERS);
  const digital = rows.find((r) => r.skill === 'Digital & IT');
  assert.equal(Math.round(digital.cells[1].load * 100), 135);
  assert.equal(hotspots[0].skill, 'Digital & IT');
  assert.equal(hotspots[0].band, 'over');
});

test('dependency analysis finds the bottleneck, at-risk links and cycles', () => {
  assert.equal(a.dependencies.bottlenecks[0].id, 'ERP-03');
  assert.equal(a.dependencies.bottlenecks[0].dependants.length, 5);
  assert.ok(a.dependencies.atRisk.some((e) => e.from === 'ERP-03'));
  const cyclic = [
    { id: 'X', rag: { timing: 'G', cost: 'G', scope: 'G' }, dependsOn: ['Y'] },
    { id: 'Y', rag: { timing: 'G', cost: 'G', scope: 'G' }, dependsOn: ['X'] },
    { id: 'Z', rag: { timing: 'G', cost: 'G', scope: 'G' }, dependsOn: ['MISSING'] },
  ];
  const d = dependencyAnalysis(cyclic);
  assert.equal(d.cycles.length > 0, true);
  assert.equal(d.broken[0].from, 'MISSING');
});

test('the engine is deterministic', () => {
  assert.deepEqual(analyse(portfolio).items.map((i) => i.rec), a.items.map((i) => i.rec));
});
