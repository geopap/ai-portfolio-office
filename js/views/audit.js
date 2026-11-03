import { esc, section, pageHead, download, toast } from '../ui.js';
import { verifyChain } from '../audit.js';
import { freshState, save, log } from '../store.js';

let verdict = null;

export function render({ state }) {
  const rows = state.audit.slice().reverse().map((e) => `<tr>
    <td class="r muted">${e.seq}</td><td class="small">${esc(new Date(e.ts).toLocaleString('en-GB'))}</td>
    <td><span class="actor ${e.actor === 'agent' ? 'agent' : 'human'}">${esc(e.actor)}</span></td>
    <td><code>${esc(e.action)}</code></td><td>${esc(e.detail)}</td><td class="hash" title="${esc(e.hash)}">${esc(e.hash.slice(0, 10))}…</td></tr>`).join('');

  return `
    ${pageHead('Every step is logged', 'Audit trail & data', 'A tamper-evident record of what the agent did and what people decided. Each entry includes the hash of the one before it, so any edit breaks the chain.')}
    ${section(`Audit log — ${state.audit.length} entries`, `
      <div class="row"><button class="btn" id="verify">Verify chain integrity</button><button class="btn ghost" id="export-log">Export log (JSON)</button>
      ${verdict ? `<span class="pill ${verdict.ok ? 'ok' : 'bad'}">${verdict.ok ? `✓ Chain intact — ${verdict.entries} entries` : `✕ Broken at entry ${verdict.brokenAt}: ${esc(verdict.reason)}`}</span>` : ''}</div>
      <div class="table-wrap"><table class="table audit"><thead><tr><th class="r">#</th><th>Time</th><th>Actor</th><th>Action</th><th>Detail</th><th>Hash</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="muted">No entries yet — run the monthly cycle.</td></tr>'}</tbody></table></div>`)}
    <div class="grid-2">
      ${section('Portfolio data', `<p class="small">Export the full portfolio as JSON, edit it, and import it again — or use the CSV status request on the agent page for monthly updates.</p>
        <div class="row"><button class="btn ghost" id="export-json">Export portfolio (JSON)</button>
        <label class="btn ghost file">Import portfolio (JSON)<input type="file" id="import-json" accept=".json,application/json" hidden></label></div>`)}
      ${section('Reset the demo', `<p class="small">Restore the synthetic Lumera Group portfolio and clear the cycle, overrides and audit log stored in this browser.</p>
        <button class="btn danger" id="reset">Reset demo data</button>`)}
    </div>`;
}

export function bind({ root, state, refresh, replaceState }) {
  const $ = (s) => root.querySelector(s);
  $('#verify').addEventListener('click', async () => { verdict = await verifyChain(state.audit); refresh(); });
  $('#export-log').addEventListener('click', () => download('audit-log.json', JSON.stringify(state.audit, null, 2), 'application/json'));
  $('#export-json').addEventListener('click', () => download('portfolio.json', JSON.stringify(state.portfolio.initiatives, null, 2), 'application/json'));
  $('#import-json').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      if (f.size > 2_000_000) throw new Error('file too large');
      const data = JSON.parse(await f.text());
      if (!Array.isArray(data) || !data.every(validInitiative)) throw new Error('not a valid initiative list');
      state.portfolio.initiatives = data;
      state.cycle = { status: 'not started', steps: {}, reviewer: '', comment: '', decidedAt: null };
      state.narrative = null;
      state.overrides = {};
      await log(state, 'user', 'PORTFOLIO_IMPORTED', `${data.length} initiatives imported from ${f.name.slice(0, 80)}`);
      toast(`${data.length} initiatives imported.`);
      refresh();
    } catch (err) { toast('Import failed: ' + err.message); }
  });
  $('#reset').addEventListener('click', async () => {
    if (!confirm('Reset all demo data in this browser?')) return;
    const s = freshState();
    verdict = null;
    await log(s, 'user', 'DEMO_RESET', 'Synthetic portfolio restored');
    save(s);
    replaceState(s);
  });
}

const RAG = ['G', 'A', 'R'];
function validInitiative(i) {
  return i && typeof i.id === 'string' && typeof i.name === 'string' && i.rag && RAG.includes(i.rag.timing) && RAG.includes(i.rag.cost) && RAG.includes(i.rag.scope)
    && typeof i.phase === 'string' && i.scores && typeof i.budget === 'number' && typeof i.actuals === 'number' && i.bc && Array.isArray(i.dependsOn ?? []);
}
