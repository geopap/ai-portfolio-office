// The monthly status request as a spreadsheet: the agent sends a pre-filled
// template (Request), owners return it (Collect), and the import updates the portfolio.

export const STATUS_COLUMNS = ['id', 'name', 'owner', 'timing', 'cost', 'scope', 'kpi_actual', 'actuals_eur_k', 'last_update', 'update'];

export function toStatusCsv(initiatives) {
  const rows = initiatives.map((i) => [
    i.id, i.name, i.owner, i.rag.timing, i.rag.cost, i.rag.scope,
    i.kpi ? i.kpi.actual : '', i.actuals, i.lastUpdate, i.update || '',
  ]);
  return [STATUS_COLUMNS, ...rows].map((r) => r.map(cell).join(',')).join('\n');
}

function cell(v) {
  let s = String(v ?? '');
  // Neutralise spreadsheet formula injection (=, +, -, @ at the start of a cell).
  if (/^[=+\-@]/.test(s) && isNaN(Number(s))) s = "'" + s;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim() !== ''));
}

// Apply returned status rows. Returns the updated list plus a per-row change log;
// rows that fail validation are rejected, never partially applied.
export function applyStatusCsv(initiatives, text) {
  const [header, ...rows] = parseCsv(text);
  if (!header) return { initiatives, applied: [], rejected: [{ row: 0, reason: 'empty file' }] };
  const col = Object.fromEntries(header.map((h, i) => [h.trim().toLowerCase(), i]));
  if (col.id === undefined) return { initiatives, applied: [], rejected: [{ row: 1, reason: 'missing "id" column' }] };

  const next = initiatives.map((i) => structuredClone(i));
  const byId = Object.fromEntries(next.map((i) => [i.id, i]));
  const applied = [], rejected = [];
  rows.forEach((r, n) => {
    const get = (k) => (col[k] !== undefined ? (r[col[k]] ?? '').trim() : '');
    const it = byId[get('id')];
    if (!it) return rejected.push({ row: n + 2, reason: `unknown id "${get('id')}"` });
    const rag = ['timing', 'cost', 'scope'].map((k) => get(k).toUpperCase());
    if (rag.some((v) => v && !['G', 'A', 'R'].includes(v))) return rejected.push({ row: n + 2, reason: 'RAG values must be G, A or R' });
    const kpi = get('kpi_actual'), act = get('actuals_eur_k'), date = get('last_update');
    if (kpi && isNaN(Number(kpi))) return rejected.push({ row: n + 2, reason: 'kpi_actual is not a number' });
    if (act && isNaN(Number(act))) return rejected.push({ row: n + 2, reason: 'actuals_eur_k is not a number' });
    if (date && isNaN(Date.parse(date))) return rejected.push({ row: n + 2, reason: 'last_update is not a date' });

    ['timing', 'cost', 'scope'].forEach((k, j) => { if (rag[j]) it.rag[k] = rag[j]; });
    if (kpi && it.kpi) it.kpi.actual = Number(kpi);
    if (act) it.actuals = Number(act);
    if (date) it.lastUpdate = date;
    if (col.update !== undefined) it.update = get('update').slice(0, 1000);
    it.submitted = true;
    applied.push(it.id);
  });
  return { initiatives: next, applied, rejected };
}
