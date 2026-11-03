import { esc, sev, call, section, pageHead, download, toast } from '../ui.js';
import { toStatusCsv, applyStatusCsv } from '../csv.js';
import { templateNarrative } from '../narrative.js';
import { draftNarrative, buildFacts, MODELS } from '../llm.js';
import { log, save, session } from '../store.js';

const STEPS = [
  { key: 'request', n: 1, title: 'Request', text: 'Sends each owner a pre-filled status request.' },
  { key: 'collect', n: 2, title: 'Collect', text: 'Gathers replies and auto-chases what is missing.' },
  { key: 'review', n: 3, title: 'Review', text: 'Checks every report for gaps, errors and plan deviations.' },
  { key: 'consolidate', n: 4, title: 'Consolidate', text: 'Builds one draft pack with flags and recommendations.' },
  { key: 'dashboards', n: 5, title: 'Dashboards & KPIs', text: 'Refreshes the views and flags KPIs that miss target.' },
];

let running = false;
let aiBusy = false;

export function render({ state, a }) {
  const c = state.cycle;
  const steps = STEPS.map((s) => {
    const done = c.steps[s.key];
    const cls = done ? 'done' : running && !done && STEPS.find((x) => !c.steps[x.key])?.key === s.key ? 'active' : '';
    return `<li class="step ${cls}"><div class="step-n">${done ? '✓' : s.n}</div><div><b>${esc(s.title)}</b><div class="small muted">${esc(s.text)}</div>
      ${done ? `<div class="step-out">${esc(done.summary)}</div>` : ''}</div></li>`;
  }).join('');
  const signoffState = c.status === 'approved' ? 'done' : c.status === 'awaiting sign-off' ? 'active' : '';

  const issues = a.issues.slice().sort((x, y) => (x.severity === 'high' ? -1 : 1) - (y.severity === 'high' ? -1 : 1));
  const name = (id) => a.items.find((i) => i.id === id)?.name || id;
  const queue = issues.map((x) => `<tr><td>${sev(x.severity)}</td><td><a href="#/portfolio?id=${esc(x.id)}">${esc(name(x.id))}</a></td><td><code>${esc(x.code)}</code></td><td>${esc(x.message)}</td></tr>`).join('');

  const n = state.narrative;
  const narrative = n ? `
    <div class="narrative ${n.source === 'ai' ? 'is-ai' : ''}">
      <div class="narrative-label">${n.source === 'ai'
        ? `<span class="tag tag-ai">AI-generated draft</span> ${esc(n.model)} · requires human review`
        : '<span class="tag">Rules-based draft</span> assembled from engine output — every figure traceable'}</div>
      ${n.text.split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}
      ${n.source === 'ai' ? (n.unverified?.length
        ? `<div class="banner warn">Grounding check: ${n.unverified.length} figure(s) not found in the facts sent — <b>${esc(n.unverified.join(', '))}</b>. Verify or edit before sign-off.</div>`
        : '<div class="banner ok">Grounding check passed — every figure in the draft appears in the facts sent.</div>') : ''}
    </div>` : '<p class="muted">The draft summary appears after the Consolidate step.</p>';

  const key = session.get('aipo.key');
  const aiPanel = `
    <details class="ai-panel" ${n?.source === 'ai' ? '' : ''}>
      <summary>Draft the summary with Claude (optional, bring your own API key)</summary>
      <div class="ai-form">
        <label>Anthropic API key<input type="password" id="ai-key" autocomplete="off" placeholder="sk-ant-…" value="${esc(key)}"></label>
        <label>Model<select id="ai-model">${MODELS.map((m) => `<option value="${m.id}">${esc(m.label)}</option>`).join('')}</select></label>
        <label class="check"><input type="checkbox" id="ai-consent"> I understand that pseudonymised portfolio facts (no owner names) will be sent to the Anthropic API. The key stays in this browser tab only.</label>
        <div class="row"><button class="btn" id="ai-run" ${aiBusy ? 'disabled' : ''}>${aiBusy ? 'Drafting…' : 'Draft with Claude'}</button>
          <button class="btn ghost" id="ai-facts">Preview data sent</button>
          ${key ? '<button class="btn ghost" id="ai-forget">Forget key</button>' : ''}</div>
        <pre class="facts" id="facts" hidden></pre>
      </div>
    </details>`;

  const overrides = a.decisions.map((i) => {
    const o = state.overrides[i.id];
    return `<li class="decision">${call(i.rec.call)} <b>${esc(i.name)}</b> <span class="small muted">${esc(i.rec.why.join('; '))}</span>
      ${o ? `<div class="override-note">Overridden to <b>${esc(o.call)}</b> by ${esc(o.by)} — “${esc(o.rationale)}” <button class="link" data-undo="${esc(i.id)}">undo</button></div>`
        : `<form class="override" data-override="${esc(i.id)}"><select name="call">${['REVISE', 'CONTINUE', 'STOP', 'SCALE'].filter((x) => x !== i.rec.call).map((x) => `<option>${x}</option>`).join('')}</select>
          <input name="rationale" required minlength="10" placeholder="Rationale (required, logged)"><button class="btn small">Override</button></form>`}</li>`;
  }).join('');

  const canSign = c.status === 'awaiting sign-off';
  return `
    ${pageHead('The AI-enabled PMO in action', 'Monthly agent cycle', 'The agent runs the collection-to-report loop. It prepares; a person decides. Nothing circulates until the PMO lead signs off, and every step is written to the audit trail.')}
    <div class="grid-2 wide-left">
      ${section('The automated loop', `<ol class="steps">${steps}
        <li class="step human ${signoffState}"><div class="step-n">${c.status === 'approved' ? '✓' : '6'}</div><div><b>Human sign-off</b><div class="small muted">The PMO lead reviews the pack, applies judgement and takes the decisions to the CEO &amp; CFO.</div>
        ${c.status === 'approved' ? `<div class="step-out">Approved by ${esc(c.reviewer)} · ${esc(new Date(c.decidedAt).toLocaleString('en-GB'))}</div>` : ''}
        ${c.status === 'returned' ? `<div class="step-out neg">Returned by ${esc(c.reviewer)}: ${esc(c.comment)}</div>` : ''}</div></li></ol>
        <div class="row"><button class="btn primary" id="run" ${running ? 'disabled' : ''}>${running ? 'Running…' : c.status === 'not started' ? 'Run monthly cycle' : 'Re-run cycle'}</button>
        <button class="btn ghost" id="tpl">Download status request (CSV)</button>
        <label class="btn ghost file">Upload returned statuses<input type="file" id="upload" accept=".csv,text/csv" hidden></label></div>`,
        `<span class="pill">Status: <b>${esc(c.status)}</b></span>`)}
      ${section('Human sign-off', `
        <form id="signoff" class="signoff ${canSign ? '' : 'disabled'}">
          <label>Reviewer<input name="reviewer" required placeholder="PMO lead name" value="${esc(c.reviewer)}" ${canSign ? '' : 'disabled'}></label>
          <label class="check"><input type="checkbox" name="c1" required ${canSign ? '' : 'disabled'}> I checked the flagged figures against their source (finance actuals, KPI dashboards).</label>
          <label class="check"><input type="checkbox" name="c2" required ${canSign ? '' : 'disabled'}> I reviewed every high-severity finding in the review queue.</label>
          <label class="check"><input type="checkbox" name="c3" required ${canSign ? '' : 'disabled'}> I read the draft summary and take accountability for its content.</label>
          <label>Comment<textarea name="comment" rows="2" placeholder="Optional for approval, required to return" ${canSign ? '' : 'disabled'}></textarea></label>
          <div class="row"><button class="btn primary" name="approve" ${canSign ? '' : 'disabled'}>Approve for circulation</button><button class="btn ghost" name="return" type="button" ${canSign ? '' : 'disabled'}>Return to agent</button></div>
          ${canSign ? '' : `<p class="small muted">${c.status === 'approved' ? 'Signed off. Re-run the cycle to start a new review.' : 'Available once the agent has prepared the pack.'}</p>`}
        </form>`)}
    </div>
    ${section('Draft executive summary', narrative + aiPanel, n ? '<a class="small" href="#/report">Open board report →</a>' : '')}
    <div class="grid-2">
      ${section(`Review queue — ${a.issues.length} findings`, `<div class="table-wrap"><table class="table"><thead><tr><th>Severity</th><th>Initiative</th><th>Check</th><th>Finding</th></tr></thead><tbody>${queue || '<tr><td colspan="4" class="muted">No findings.</td></tr>'}</tbody></table></div>`)}
      ${section('Recommendations — accept or override', `<p class="small muted">Recommendations come from the rules engine. A person can override any of them; the rationale is mandatory and logged.</p><ul class="flags">${overrides}</ul>`)}
    </div>`;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export function bind(ctx) {
  const { root, state, refresh } = ctx;
  const $ = (s) => root.querySelector(s);

  $('#run').addEventListener('click', async () => {
    running = true;
    state.cycle = { status: 'running', steps: {}, reviewer: '', comment: '', decidedAt: null };
    state.narrative = null;
    await log(state, 'agent', 'CYCLE_START', `Monthly cycle started for ${state.portfolio.period.label}`);
    refresh();
    for (const s of STEPS) {
      await wait(650);
      const a = ctx.analyse();
      const summary = stepSummary(s.key, a, state);
      state.cycle.steps[s.key] = { at: new Date().toISOString(), summary };
      if (s.key === 'consolidate') state.narrative = { source: 'rules', text: templateNarrative(a) };
      await log(state, 'agent', `STEP_${s.key.toUpperCase()}`, summary);
      refresh();
    }
    running = false;
    state.cycle.status = 'awaiting sign-off';
    await log(state, 'agent', 'AWAITING_SIGNOFF', 'Draft pack prepared. Not circulated — human sign-off required.');
    refresh();
  });

  $('#tpl').addEventListener('click', async () => {
    download(`status-request-${state.portfolio.period.label.replace(/\s/g, '-')}.csv`, toStatusCsv(state.portfolio.initiatives), 'text/csv');
    await log(state, 'user', 'TEMPLATE_DOWNLOADED', 'Status request template exported');
  });

  $('#upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1_000_000) return toast('File too large (max 1 MB).');
    const res = applyStatusCsv(state.portfolio.initiatives, await file.text());
    state.portfolio.initiatives = res.initiatives;
    state.cycle = { status: 'not started', steps: {}, reviewer: '', comment: '', decidedAt: null };
    state.narrative = null;
    await log(state, 'user', 'STATUS_IMPORTED', `${res.applied.length} rows applied, ${res.rejected.length} rejected${res.rejected.length ? ': ' + res.rejected.map((r) => `row ${r.row} (${r.reason})`).join('; ') : ''}`);
    toast(`${res.applied.length} updates applied${res.rejected.length ? `, ${res.rejected.length} rejected — see audit log` : ''}. Re-run the cycle.`);
    refresh();
  });

  const form = $('#signoff');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    state.cycle.status = 'approved';
    state.cycle.reviewer = String(f.get('reviewer')).trim().slice(0, 80);
    state.cycle.comment = String(f.get('comment') || '').trim().slice(0, 500);
    state.cycle.decidedAt = new Date().toISOString();
    await log(state, state.cycle.reviewer, 'PACK_APPROVED', `Approved for circulation${state.cycle.comment ? ': ' + state.cycle.comment : ''} (narrative source: ${state.narrative?.source})`);
    toast('Pack approved — the board report is now released.');
    refresh();
  });
  form.querySelector('[name=return]').addEventListener('click', async () => {
    const f = new FormData(form);
    const reviewer = String(f.get('reviewer') || '').trim();
    const comment = String(f.get('comment') || '').trim();
    if (!reviewer || !comment) return toast('Reviewer and comment are required to return the pack.');
    Object.assign(state.cycle, { status: 'returned', reviewer: reviewer.slice(0, 80), comment: comment.slice(0, 500), decidedAt: new Date().toISOString() });
    await log(state, reviewer, 'PACK_RETURNED', comment);
    refresh();
  });

  root.querySelectorAll('[data-override]').forEach((fm) => fm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(fm);
    const id = fm.dataset.override;
    const by = state.cycle.reviewer || 'PMO lead';
    const rec = ctx.analyse().items.find((i) => i.id === id).rec.call;
    state.overrides[id] = { call: f.get('call'), rationale: String(f.get('rationale')).trim().slice(0, 300), by, at: new Date().toISOString() };
    await log(state, by, 'RECOMMENDATION_OVERRIDDEN', `${id}: ${rec} → ${f.get('call')} — ${state.overrides[id].rationale}`);
    refresh();
  }));
  root.querySelectorAll('[data-undo]').forEach((b) => b.addEventListener('click', async () => {
    delete state.overrides[b.dataset.undo];
    await log(state, state.cycle.reviewer || 'PMO lead', 'OVERRIDE_REVERTED', b.dataset.undo);
    refresh();
  }));

  $('#ai-facts').addEventListener('click', () => {
    const pre = $('#facts');
    pre.hidden = !pre.hidden;
    pre.textContent = JSON.stringify(buildFacts(ctx.analyse()).facts, null, 2);
  });
  $('#ai-forget')?.addEventListener('click', () => { session.set('aipo.key', ''); refresh(); });
  $('#ai-run').addEventListener('click', async () => {
    const apiKey = $('#ai-key').value.trim();
    if (!state.cycle.steps.consolidate) return toast('Run the monthly cycle first.');
    if (!apiKey) return toast('Enter an Anthropic API key.');
    if (!$('#ai-consent').checked) return toast('Please confirm the data-sharing notice first.');
    session.set('aipo.key', apiKey);
    aiBusy = true;
    refresh();
    const model = $('#ai-model')?.value || MODELS[0].id;
    try {
      const r = await draftNarrative({ apiKey, model, analysis: ctx.analyse() });
      state.narrative = { source: 'ai', text: r.text, unverified: r.unverified, model: r.model };
      if (state.cycle.status === 'approved') state.cycle.status = 'awaiting sign-off';
      await log(state, 'agent', 'AI_DRAFT_CREATED', `Model ${r.model}; grounding check: ${r.unverified.length ? 'unverified figures ' + r.unverified.join(', ') : 'passed'}; tokens in/out ${r.usage?.input_tokens ?? '?'}/${r.usage?.output_tokens ?? '?'}`);
    } catch (err) {
      toast('Claude request failed: ' + err.message);
      await log(state, 'agent', 'AI_DRAFT_FAILED', err.message.slice(0, 200));
    } finally {
      aiBusy = false;
      save(state);
      refresh();
    }
  });
}

function stepSummary(key, a, state) {
  const its = state.portfolio.initiatives;
  const missing = its.filter((i) => !i.submitted);
  switch (key) {
    case 'request': return `${its.length} pre-filled status requests sent to initiative owners.`;
    case 'collect': return `${its.length - missing.length}/${its.length} reports received.` + (missing.length ? ` Auto-chase sent for ${missing.map((m) => m.id).join(', ')}.` : '');
    case 'review': {
      const hi = a.issues.filter((i) => i.severity === 'high').length;
      return `${a.issues.length} findings (${hi} high) — incl. ${[...new Set(a.issues.map((i) => i.code))].join(', ')}.`;
    }
    case 'consolidate': return `Draft pack: ${a.exceptions.length} exceptions, ${a.decisions.length} decisions, summary drafted from rules.`;
    case 'dashboards': return `Views refreshed. ${a.items.filter((i) => i.trend === 'behind').length} KPIs below plan; peak capacity load ${Math.round(a.stats.peakLoad * 100)}%.`;
    default: return '';
  }
}
