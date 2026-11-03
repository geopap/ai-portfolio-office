import { esc, section, pageHead, rag } from '../ui.js';

// Layered layout: an initiative sits one column to the right of its deepest prerequisite.
function layers(items) {
  const byId = Object.fromEntries(items.map((i) => [i.id, i]));
  const depth = {};
  const d = (id, seen = new Set()) => {
    if (depth[id] !== undefined) return depth[id];
    if (seen.has(id)) return 0;
    seen.add(id);
    const ups = (byId[id]?.dependsOn || []).filter((u) => byId[u]);
    return (depth[id] = ups.length ? 1 + Math.max(...ups.map((u) => d(u, seen))) : 0);
  };
  items.forEach((i) => d(i.id));
  return depth;
}

export function render({ a }) {
  const linked = new Set(a.dependencies.edges.flatMap((e) => [e.from, e.to]));
  const nodes = a.items.filter((i) => linked.has(i.id));
  const standalone = a.items.filter((i) => !linked.has(i.id));
  const depth = layers(nodes);
  const cols = {};
  nodes.forEach((n) => (cols[depth[n.id]] ||= []).push(n));
  const bottleneckIds = new Set(a.dependencies.bottlenecks.map((b) => b.id));

  const NW = 196, NH = 48, GX = 70, GY = 26, P = 20;
  const ncols = Object.keys(cols).length;
  const maxRows = Math.max(...Object.values(cols).map((c) => c.length));
  const W = P * 2 + ncols * NW + (ncols - 1) * GX;
  const H = P * 2 + maxRows * NH + (maxRows - 1) * GY;
  const pos = {};
  Object.entries(cols).forEach(([c, list]) => {
    const offset = (H - (list.length * NH + (list.length - 1) * GY)) / 2;
    list.forEach((n, r) => { pos[n.id] = { x: P + c * (NW + GX), y: offset + r * (NH + GY) }; });
  });

  const atRisk = new Set(a.dependencies.atRisk.map((e) => e.from + '>' + e.to));
  const edges = a.dependencies.edges.map((e) => {
    const s = pos[e.from], t = pos[e.to];
    const x1 = s.x + NW, y1 = s.y + NH / 2, x2 = t.x, y2 = t.y + NH / 2, mx = (x1 + x2) / 2;
    const risk = atRisk.has(e.from + '>' + e.to);
    return `<path class="edge ${risk ? 'edge-risk' : ''}" d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2 - 6},${y2}" marker-end="url(#${risk ? 'arrow-risk' : 'arrow'})"><title>${esc(e.from)} must land for ${esc(e.to)} to proceed</title></path>`;
  }).join('');
  const boxes = nodes.map((n) => {
    const p = pos[n.id];
    return `<a href="#/portfolio?id=${esc(n.id)}"><g class="node node-${n.status} ${bottleneckIds.has(n.id) ? 'node-bottleneck' : ''}">
      <rect x="${p.x}" y="${p.y}" width="${NW}" height="${NH}" rx="8"/>
      <text x="${p.x + 12}" y="${p.y + 20}" class="node-title">${esc(n.name)}</text>
      <text x="${p.x + 12}" y="${p.y + 37}" class="node-sub">${esc(n.id)} · ${esc(n.phase)}</text>
      <circle cx="${p.x + NW - 14}" cy="${p.y + 16}" r="5" class="node-dot"/></g></a>`;
  }).join('');

  const svg = `<div class="graph-wrap"><svg class="graph" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Initiative dependency map">
    <defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="arrow"/></marker>
    <marker id="arrow-risk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" class="arrow-risk"/></marker></defs>
    ${edges}${boxes}</svg></div>`;

  const name = (id) => a.items.find((i) => i.id === id)?.name || id;
  const watch = [
    ...a.dependencies.bottlenecks.map((b) => `<li class="flag"><div class="flag-head"><span class="sev sev-high">high</span> <b>${esc(name(b.id))} is a choke point</b></div>
      <div class="flag-body">${b.dependants.length} initiatives depend on it (${esc(b.dependants.map(name).join(', '))}). Status ${rag(b.status)} — any slip cascades. Protect this timeline first.</div></li>`),
    ...a.dependencies.atRisk.filter((e) => !bottleneckIds.has(e.from)).map((e) => `<li class="flag"><div class="flag-head"><span class="sev sev-medium">watch</span> <b>${esc(name(e.from))} → ${esc(name(e.to))}</b></div>
      <div class="flag-body">Upstream timing is ${rag(e.upstreamTiming)}. Track its milestone as a hard prerequisite, not a parallel workstream.</div></li>`),
    ...a.dependencies.cycles.map((c) => `<li class="flag"><span class="sev sev-high">cycle</span> Circular dependency: ${esc(c.join(' → '))}</li>`),
    ...a.dependencies.broken.map((b) => `<li class="flag"><span class="sev sev-high">broken</span> ${esc(b.to)} depends on ${esc(b.from)} (${esc(b.reason)})</li>`),
  ].join('');

  return `
    ${pageHead('Nothing runs alone', 'Dependency map', 'Cross-initiative links made explicit — what needs what — so conflicts surface in planning, not in delivery. Arrows point from prerequisite to the initiative that needs it.')}
    ${section('Critical links', `${svg}<div class="legend"><span><i class="sw sw-edge"></i>enables</span><span><i class="sw sw-edge-risk"></i>at risk — upstream timing not green</span><span><i class="sw sw-bottleneck"></i>bottleneck (≥3 dependants)</span></div>`)}
    <div class="grid-2">
      ${section('Watch list', `<ul class="flags">${watch || '<li class="muted">No dependency risks.</li>'}</ul>`)}
      ${section('Stand-alone initiatives', `<p class="small muted">No cross-initiative dependencies recorded.</p><ul class="chips">${standalone.map((s) => `<li><a href="#/portfolio?id=${esc(s.id)}">${esc(s.name)}</a> ${rag(s.status)}</li>`).join('')}</ul>`)}
    </div>`;
}
