// Tests for the governance controls: audit chain, CSV handling and the LLM guardrails.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendEntry, verifyChain } from '../js/audit.js';
import { toStatusCsv, applyStatusCsv, parseCsv } from '../js/csv.js';
import { buildFacts, reidentify, groundingCheck, draftNarrative } from '../js/llm.js';
import { analyse } from '../js/engine.js';
import { INITIATIVES, CAPACITY, QUARTERS, PERIOD } from '../js/data.js';

const a = analyse({ initiatives: INITIATIVES, capacity: CAPACITY, quarters: QUARTERS, period: PERIOD });

test('audit chain verifies and detects tampering', async () => {
  let log = [];
  for (const action of ['A', 'B', 'C']) log = await appendEntry(log, { actor: 'agent', action, detail: action.toLowerCase() });
  assert.deepEqual(await verifyChain(log), { ok: true, entries: 3 });

  const edited = structuredClone(log);
  edited[1].detail = 'changed';
  assert.equal((await verifyChain(edited)).brokenAt, 2);

  const deleted = [log[0], log[2]];
  assert.equal((await verifyChain(deleted)).ok, false);
});

test('CSV round trip applies valid updates', () => {
  const csv = toStatusCsv(INITIATIVES).replace('PRO-07,Procurement Savings,Agnieszka Nowak,G,G,G', 'PRO-07,Procurement Savings,Agnieszka Nowak,A,G,G');
  const res = applyStatusCsv(INITIATIVES, csv);
  assert.equal(res.rejected.length, 0);
  assert.equal(res.applied.length, INITIATIVES.length);
  assert.equal(res.initiatives.find((i) => i.id === 'PRO-07').rag.timing, 'A');
  assert.equal(INITIATIVES.find((i) => i.id === 'PRO-07').rag.timing, 'G', 'input is not mutated');
});

test('CSV import rejects invalid rows without partial application', () => {
  const csv = 'id,timing,cost,scope,actuals_eur_k\nPRO-07,X,G,G,100\nNOPE-1,G,G,G,1\nLG-01,G,G,G,abc';
  const res = applyStatusCsv(INITIATIVES, csv);
  assert.equal(res.applied.length, 0);
  assert.equal(res.rejected.length, 3);
});

test('CSV export neutralises spreadsheet formula injection', () => {
  const evil = [{ ...structuredClone(INITIATIVES[0]), update: '=HYPERLINK("http://x","click")' }];
  const rows = parseCsv(toStatusCsv(evil));
  assert.ok(rows[1].at(-1).startsWith("'="));
});

test('facts sent to the model contain no owner names', () => {
  const { facts, map } = buildFacts(a);
  const json = JSON.stringify(facts);
  for (const i of INITIATIVES) assert.ok(!json.includes(i.owner), `${i.owner} leaked`);
  assert.ok(Object.values(map).every((t) => /^OWNER_\d+$/.test(t)));
  const name = Object.keys(map)[0];
  assert.equal(reidentify(`Contact ${map[name]}.`, map), `Contact ${name}.`);
});

test('grounding check flags figures not present in the facts', () => {
  const { facts } = buildFacts(a);
  assert.deepEqual(groundingCheck('Nordic Entry is -35% vs plan [NOR-09].', facts), []);
  assert.deepEqual(groundingCheck('Nordic Entry is -47% vs plan and needs 12.5m [NOR-09].', facts), ['47', '12.5']);
});

const reply = (body, status = 200) => ({ ok: status < 300, status, json: async () => body });

test('narrative draft sends pseudonymised facts and returns re-identified text', async () => {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push(JSON.parse(opts.body));
    return reply({ model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: 'Escalate to OWNER_1 [NOR-09].' }], usage: {} });
  };
  const r = await draftNarrative({ apiKey: 'test', model: 'claude-opus-5-5', analysis: a, fetchImpl });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].fallbacks, 'default');
  assert.ok(!calls[0].messages[0].content.includes('Erik Lindqvist'));
  assert.ok(r.text.startsWith('Escalate to ') && !r.text.includes('OWNER_'));
});

test('narrative draft retries without fallbacks on 400 and surfaces refusals', async () => {
  let n = 0;
  const fetchImpl = async (url, opts) => {
    n++;
    const body = JSON.parse(opts.body);
    if (body.fallbacks) return reply({ error: { message: 'fallbacks not supported' } }, 400);
    return reply({ stop_reason: 'refusal', content: [] });
  };
  await assert.rejects(draftNarrative({ apiKey: 'test', model: 'claude-sonnet-5-5', analysis: a, fetchImpl }), /declined/);
  assert.equal(n, 2);
});
