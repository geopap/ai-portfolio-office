import { section, pageHead } from '../ui.js';

export function render() {
  return `
    ${pageHead('About this project', 'An AI-enabled Strategic Portfolio Office', 'A working reference implementation of a lean, AI-augmented PMO: one portfolio view, financial discipline, evidence-based stage-gate calls — and an AI agent that prepares the work while people keep the decisions.')}
    <div class="grid-2">
      ${section('The problem', `<p>Large organisations run many strategic initiatives in parallel across countries, competing for the same people, budget and management attention. Growth, efficiency and cost targets pull against each other when nobody connects initiatives to value.</p>
        <p>Typical symptoms: value never proven after approval, no stop decisions, hidden resource collisions, dependencies discovered in delivery, and leadership reading project-by-project slides instead of one comparable view.</p>`)}
      ${section('The operating model', `<ol class="reasoning">
        <li><b>Curate</b> one prioritised, business-cased portfolio.</li>
        <li><b>Guard the financials</b> — topline and bottomline tracked plan vs actual.</li>
        <li><b>Prepare decisions</b> — SCALE / CONTINUE / REVISE / STOP at every gate.</li>
        <li><b>Manage dependencies &amp; capacity</b> across initiatives and countries.</li>
        <li><b>Run the rhythm</b> — a monthly cycle with one dashboard and tiered KPIs.</li>
        <li><b>Clarify central vs local</b> — group pilots, local rollouts, local projects.</li></ol>`)}
    </div>
    <div class="grid-2">
      ${section('Where AI creates value', `<p>The agent absorbs the repeatable work — requesting, chasing, checking and consolidating — so a small team delivers large-PMO discipline. Its most valuable job is not writing: it is catching what people miss, such as a status reported green while finance actuals show an overrun.</p>
        <p>The design principle throughout: <b>the agent prepares, a person decides</b>. Recommendations are deterministic and explainable; the language model only drafts prose, from pseudonymised facts, and its output is checked and signed off.</p>`)}
      ${section('Using this demo', `<ol class="reasoning">
        <li>Open <a href="#/agent">Agent cycle</a> and run the monthly loop.</li>
        <li>Inspect the review findings — including a green status that contradicts actuals and a prompt-injection attempt hidden in an update.</li>
        <li>Override a recommendation, then sign off the pack.</li>
        <li>Open the <a href="#/report">board report</a> and print it to PDF.</li>
        <li>Verify the hash chain on the <a href="#/audit">audit trail</a>.</li></ol>
        <p class="small muted">All data is synthetic. Lumera Group is a fictional company. State is stored only in your browser.</p>`)}
    </div>`;
}
