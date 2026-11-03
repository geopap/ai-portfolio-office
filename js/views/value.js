import { esc, section, pageHead, eur, trend } from '../ui.js';
import { sum } from '../engine.js';

const calc = { initiatives: 16, ownerHours: 4, pmoHours: 60, rate: 95, ownerSaving: 60, pmoSaving: 75, cycles: 12 };

export function render({ a }) {
  calc.initiatives = a.items.length;
  const objectives = ['Growth', 'Operational excellence', 'Cost savings'];
  const approved = a.items.filter((i) => i.bc.approved);
  const maxVal = Math.max(...objectives.map((o) => sum(approved.filter((i) => i.objective === o).map((i) => i.bc.netSales + i.bc.ebitda))), 1);

  const objRows = objectives.map((o) => {
    const list = approved.filter((i) => i.objective === o);
    const ns = sum(list.map((i) => i.bc.netSales));
    const eb = sum(list.map((i) => i.bc.ebitda));
    return `<div class="bar-row"><div class="bar-label">${esc(o)}<span class="muted small">${list.length} cases</span></div>
      <div class="bar-track"><span class="bar bar-ns" style="width:${(ns / maxVal) * 100}%"></span><span class="bar bar-eb" style="width:${(eb / maxVal) * 100}%"></span></div>
      <div class="bar-val">€${ns.toFixed(1)}m <span class="muted">/</span> €${eb.toFixed(1)}m</div></div>`;
  }).join('');

  const realising = a.items.filter((i) => i.ebitdaYtd);
  const maxR = Math.max(...realising.map((i) => Math.max(i.ebitdaYtd.plan, i.ebitdaYtd.actual)));
  const benefitRows = realising.map((i) => {
    const d = i.ebitdaYtd.actual - i.ebitdaYtd.plan;
    return `<div class="bar-row"><div class="bar-label">${esc(i.name)}<span class="muted small">${esc(i.id)}</span></div>
      <div class="bar-track paired"><span class="bar bar-plan" style="width:${(i.ebitdaYtd.plan / maxR) * 100}%"></span><span class="bar bar-act ${d < 0 ? 'short' : ''}" style="width:${(i.ebitdaYtd.actual / maxR) * 100}%"></span></div>
      <div class="bar-val">${eur(i.ebitdaYtd.actual)} <span class="${d < 0 ? 'neg' : 'pos'}">${d >= 0 ? '+' : ''}${eur(d)}</span></div></div>`;
  }).join('');

  const caseTotal = sum(approved.map((i) => i.bc.ebitda));
  const inDelivery = sum(approved.filter((i) => ['Develop', 'Realise'].includes(i.phase)).map((i) => i.bc.ebitda));
  const realisingCase = sum(approved.filter((i) => i.phase === 'Realise').map((i) => i.bc.ebitda));
  const confirmed = a.stats.ebitdaActual / 1000;
  const funnel = [
    ['Approved business cases', caseTotal, 'EBITDA effect over 3 years'],
    ['In delivery', inDelivery, 'Develop & Realise phases'],
    ['Realising benefits', realisingCase, 'cases now in Realise'],
    ['Confirmed YTD', confirmed, 'booked with Finance'],
  ].map(([l, v, s]) => `<div class="funnel-step" style="--w:${Math.max(18, (v / caseTotal) * 100)}%"><div class="funnel-bar"><b>€${v.toFixed(1)}m</b></div><div><b>${esc(l)}</b><div class="muted small">${esc(s)}</div></div></div>`).join('');

  const kpiRows = a.items.filter((i) => i.kpi).map((i) => `<tr><td>${esc(i.name)}</td><td>${esc(i.kpi.name)}</td><td class="r">${i.kpi.plan}</td><td class="r">${i.kpi.actual}</td><td class="r">${trend(i)}</td></tr>`).join('');

  return `
    ${pageHead('Guard the financials', 'Value & business cases', 'Every initiative carries a P&L story: a quantified case at entry, net-sales and EBITDA impact, plan-vs-actual tracking and benefits confirmed after delivery.')}
    <div class="grid-2">
      ${section('Business-case value by objective', `${objRows}<div class="legend"><span><i class="sw sw-ns"></i>Net-sales uplift (3y)</span><span><i class="sw sw-eb"></i>EBITDA effect (3y)</span></div>`)}
      ${section('From case to confirmed value', `<div class="funnel">${funnel}</div><p class="small muted">Leakage between the steps is where value gets lost after approval — the PMO tracks each step instead of forgetting the case once it is signed.</p>`)}
    </div>
    <div class="grid-2">
      ${section('Benefits realisation — EBITDA YTD', `${benefitRows}<div class="legend"><span><i class="sw sw-plan"></i>Plan</span><span><i class="sw sw-act"></i>Actual</span></div>`)}
      ${section('Value KPIs vs plan', `<div class="table-wrap"><table class="table"><thead><tr><th>Initiative</th><th>KPI</th><th class="r">Plan</th><th class="r">Actual</th><th class="r">Δ</th></tr></thead><tbody>${kpiRows}</tbody></table></div>`)}
    </div>
    ${section('AI value case — what the PMO agent is worth', calculator(), '<span class="tag">Interactive</span>')}`;
}

function calculator() {
  const field = (k, label, unit) => `<label>${esc(label)}<span class="input-unit"><input type="number" min="0" step="1" data-calc="${k}" value="${calc[k]}"><span>${esc(unit)}</span></span></label>`;
  return `<div class="calc">
    <div class="calc-inputs">
      ${field('initiatives', 'Initiatives reporting', '#')}
      ${field('ownerHours', 'Owner effort per report today', 'h')}
      ${field('pmoHours', 'PMO consolidation per cycle today', 'h')}
      ${field('rate', 'Blended hourly cost', '€')}
      ${field('ownerSaving', 'Owner effort removed by agent', '%')}
      ${field('pmoSaving', 'PMO effort removed by agent', '%')}
      ${field('cycles', 'Reporting cycles per year', '#')}
    </div>
    <div class="calc-out" id="calc-out">${calcOut()}</div>
  </div>
  <p class="small muted">Assumptions are editable and illustrative. The larger value is usually not the hours saved but the decisions taken earlier — a stop decision one quarter sooner frees budget and people for the initiatives that work.</p>`;
}

function calcOut() {
  const c = calc;
  const owner = c.initiatives * c.ownerHours * (c.ownerSaving / 100) * c.cycles;
  const pmo = c.pmoHours * (c.pmoSaving / 100) * c.cycles;
  const hours = owner + pmo;
  return `<div class="tile good"><div class="tile-value">${Math.round(hours).toLocaleString('en')}</div><div class="tile-label">hours freed per year</div></div>
    <div class="tile"><div class="tile-value">€${Math.round((hours * c.rate) / 1000).toLocaleString('en')}k</div><div class="tile-label">capacity value per year</div></div>
    <div class="tile"><div class="tile-value">${(hours / 1650).toFixed(1)}</div><div class="tile-label">FTE equivalent</div></div>
    <p class="small muted">${Math.round(owner)} h from project owners · ${Math.round(pmo)} h from the PMO</p>`;
}

export function bind({ root }) {
  root.querySelectorAll('[data-calc]').forEach((el) => el.addEventListener('input', () => {
    calc[el.dataset.calc] = Math.max(0, Number(el.value) || 0);
    root.querySelector('#calc-out').innerHTML = calcOut();
  }));
}
