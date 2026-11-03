import { esc, section, pageHead } from '../ui.js';
import { RULES } from '../rules.js';

export const CONTROLS = [
  { id: 'GOV-01', name: 'Human sign-off before circulation', impl: 'No pack is released without a named reviewer and a three-point checklist; reviewers can approve or return.', link: '#/agent', aiact: 'Art. 14 (human oversight), Art. 26', iso: 'A.9 Use of AI systems', nist: 'GOVERN · MANAGE' },
  { id: 'GOV-02', name: 'Decision authority stays with people', impl: 'Gate calls come from a deterministic rules engine; the language model drafts prose only and cannot change a recommendation.', link: '#/prioritise', aiact: 'Art. 14(4)', iso: 'A.9 Use of AI systems', nist: 'MAP · MANAGE' },
  { id: 'GOV-03', name: 'Override with mandatory rationale', impl: 'Any recommendation can be overridden; a written rationale is required and logged, and shown on the board report.', link: '#/agent', aiact: 'Art. 14(4)(d)', iso: 'A.9 Use of AI systems', nist: 'MANAGE' },
  { id: 'GOV-04', name: 'Tamper-evident audit trail', impl: 'Every agent step and human action is appended to a SHA-256 hash-chained log that can be verified and exported.', link: '#/audit', aiact: 'Art. 12 (record-keeping)', iso: 'A.6.2.8 Event logs', nist: 'MEASURE · MANAGE' },
  { id: 'GOV-05', name: 'AI-generated content labelled', impl: 'AI-drafted text carries a visible label in the app and on the board report; the model name is logged.', link: '#/report', aiact: 'Art. 50 (transparency), Art. 13', iso: 'A.8 Information for interested parties', nist: 'GOVERN · MEASURE' },
  { id: 'GOV-06', name: 'Grounding check on AI output', impl: 'Every number in the AI draft is matched against the facts sent; unmatched figures are flagged before sign-off.', link: '#/agent', aiact: 'Art. 15 (accuracy)', iso: 'A.6 AI system life cycle (verification)', nist: 'MEASURE' },
  { id: 'GOV-07', name: 'Data minimisation & pseudonymisation', impl: 'Only report-level facts are sent to the model; owner names are replaced with tokens and restored locally.', link: '#/agent', aiact: 'Art. 10 (data governance) · GDPR Art. 5(1)(c), 25', iso: 'A.7 Data for AI systems', nist: 'MAP · MANAGE (privacy)' },
  { id: 'GOV-08', name: 'Prompt-injection containment', impl: 'Free-text updates are scanned for instruction-like content, wrapped as untrusted data, and the model has no tools or write access.', link: '#/agent', aiact: 'Art. 15(5) (cybersecurity)', iso: 'A.6 AI system life cycle', nist: 'MEASURE · MANAGE (security)' },
  { id: 'GOV-09', name: 'Input data-quality checks', impl: 'The review step checks completeness, staleness, business-case presence and self-reported status vs finance actuals.', link: '#/agent', aiact: 'Art. 10 (data quality)', iso: 'A.7 Data for AI systems', nist: 'MEASURE' },
  { id: 'GOV-10', name: 'Policy as code, versioned & tested', impl: 'All thresholds live in one versioned rules file, shown below, with unit tests run in CI on every change.', link: '#/governance', aiact: 'Art. 11, 13 (documentation)', iso: 'A.6 AI system life cycle', nist: 'GOVERN · MEASURE' },
  { id: 'GOV-11', name: 'Scope limited to projects, not people', impl: 'The system rates initiatives, never individuals. Owner names are used for routing only — no person-level scoring.', link: '#/governance', aiact: 'Art. 6 & Annex III(4) (kept out of scope)', iso: 'A.5 Impact assessment', nist: 'MAP' },
  { id: 'GOV-12', name: 'Third-party model provider', impl: 'The model is used through the provider API with the deployer’s own key; provider terms, retention and region are reviewed before go-live.', link: '#/governance', aiact: 'Art. 25, 53 (GPAI value chain)', iso: 'A.10 Third-party relationships', nist: 'GOVERN (third-party risk)' },
  { id: 'GOV-13', name: 'Application security baseline', impl: 'Strict Content-Security-Policy, no third-party scripts, output escaping, CSV formula neutralisation, key kept in tab session only.', link: '#/governance', aiact: 'Art. 15 (robustness)', iso: 'A.6 AI system life cycle', nist: 'MANAGE' },
  { id: 'GOV-14', name: 'AI literacy for users', impl: 'Reviewers are trained on the system card, limitations and automation bias before receiving sign-off rights.', link: '#/governance', aiact: 'Art. 4 (AI literacy)', iso: 'A.4 Resources · clause 7.2', nist: 'GOVERN' },
];

const RISKS = [
  ['Ungrounded or invented figures in the AI draft', 'M', 'H', 'Grounding check (GOV-06), rules-based default narrative, human sign-off (GOV-01)', 'L'],
  ['Automation bias — reviewers rubber-stamp the pack', 'M', 'H', 'Sign-off checklist, visible rule and reasons per call, mandatory override rationale (GOV-03), literacy (GOV-14)', 'M'],
  ['Prompt injection through status-update text', 'M', 'M', 'Pattern detection, data wrapping, no tool access, model cannot alter calls (GOV-02, GOV-08)', 'L'],
  ['Personal data sent to the model provider', 'L', 'M', 'Pseudonymisation and minimisation (GOV-07), consent notice, provider review (GOV-12)', 'L'],
  ['Green-washing — self-reported status hides problems', 'H', 'H', 'Cross-check of reported RAG against finance actuals and KPIs (GOV-09)', 'M'],
  ['Stale or missing reports distort the picture', 'M', 'M', 'Stale / missing checks, auto-chase, completeness KPI (GOV-09)', 'L'],
  ['Use drifts into judging individuals', 'L', 'H', 'Documented out-of-scope use; no person-level scoring (GOV-11)', 'L'],
  ['Rule thresholds mis-calibrated', 'M', 'M', 'Versioned rules, unit tests, quarterly threshold review with the CFO (GOV-10)', 'L'],
];

const lvl = (v) => `<span class="lvl lvl-${v}">${{ L: 'Low', M: 'Medium', H: 'High' }[v]}</span>`;

export function render({ a }) {
  const aiItems = a.items.filter((i) => i.aiSystem);
  return `
    ${pageHead('Trustworthy by design', 'AI governance & compliance', 'How the PMO agent is governed: what it may and may not do, how it is classified, and which controls make it auditable. The mapping is indicative and for illustration — not legal advice.')}
    <div class="grid-2">
      ${section('AI system card', `<dl class="kv wide">
        <dt>System</dt><dd>PMO portfolio agent — collects, checks and consolidates initiative status; drafts the monthly report.</dd>
        <dt>Intended purpose</dt><dd>Decision <i>support</i> for portfolio governance: prepare evidence and recommendations for the CEO &amp; CFO.</dd>
        <dt>Not intended for</dt><dd>Taking or executing decisions; evaluating, ranking or monitoring employees; changing source systems.</dd>
        <dt>Users</dt><dd>PMO lead (reviewer, sign-off), initiative owners (input), CEO &amp; CFO (recipients).</dd>
        <dt>Components</dt><dd>Deterministic rules engine (recommendations) · optional general-purpose LLM (narrative drafting only).</dd>
        <dt>Inputs</dt><dd>Status updates, finance actuals, KPI values, business cases, capacity plans.</dd>
        <dt>Human oversight</dt><dd>Named reviewer sign-off; overrides with rationale; nothing circulates unreviewed.</dd>
        <dt>Known limitations</dt><dd>Only as good as the inputs; rules can miss context a person knows; LLM text may contain errors, which is why it is checked and signed off.</dd>
      </dl>`)}
      ${section('EU AI Act classification (indicative)', `<ol class="reasoning">
        <li><b>Prohibited practice (Art. 5)?</b> No — no manipulation, social scoring or biometric use.</li>
        <li><b>High-risk under Annex III?</b> No — it supports decisions about <i>projects and budgets</i>. It would become high-risk under Annex III(4) if used to evaluate or monitor <i>people</i>, so that use is explicitly out of scope (GOV-11).</li>
        <li><b>Transparency obligations (Art. 50)?</b> Internal decision-support text, not public-interest publishing — labelling applied voluntarily (GOV-05).</li>
        <li><b>General-purpose AI model?</b> Used via a provider API; model obligations sit with the provider, deployer duties with the company (GOV-12).</li>
      </ol>
      <div class="banner ok"><b>Result:</b> minimal / limited risk. Controls inspired by the high-risk requirements (Art. 9–15) are applied voluntarily — governance proportionate to the decisions the system informs.</div>`)}
    </div>
    ${section('Control framework', `<div class="table-wrap"><table class="table controls"><thead><tr><th>ID</th><th>Control</th><th>How it is implemented here</th><th>EU AI Act</th><th>ISO/IEC 42001 Annex A</th><th>NIST AI RMF</th></tr></thead><tbody>
      ${CONTROLS.map((c) => `<tr><td><code>${c.id}</code></td><td><b>${esc(c.name)}</b></td><td>${esc(c.impl)} <a href="${c.link}" class="small">see →</a></td><td>${esc(c.aiact)}</td><td>${esc(c.iso)}</td><td>${esc(c.nist)}</td></tr>`).join('')}
      </tbody></table></div>`, `<span class="pill">${CONTROLS.length} controls</span>`)}
    <div class="grid-2">
      ${section('AI risk register', `<div class="table-wrap"><table class="table"><thead><tr><th>Risk</th><th>Likelihood</th><th>Impact</th><th>Mitigation</th><th>Residual</th></tr></thead><tbody>
        ${RISKS.map((r) => `<tr><td>${esc(r[0])}</td><td>${lvl(r[1])}</td><td>${lvl(r[2])}</td><td class="small">${esc(r[3])}</td><td>${lvl(r[4])}</td></tr>`).join('')}</tbody></table></div>`)}
      ${section('AI inventory — systems in the portfolio', `<p class="small muted">The PMO also tracks AI systems that initiatives build, so each gets an impact assessment before it scales.</p>
        <div class="table-wrap"><table class="table"><thead><tr><th>System</th><th>Use</th><th>Indicative class</th><th>Gate requirement</th></tr></thead><tbody>
        <tr><td><b>PMO portfolio agent</b></td><td>Decision support, internal</td><td>Minimal / limited</td><td>This page</td></tr>
        ${aiItems.map((i) => `<tr><td><a href="#/portfolio?id=${esc(i.id)}"><b>${esc(i.name)}</b></a></td><td>Customer-facing assistant</td><td>Limited — Art. 50(1): users must know they talk to AI</td><td>AI impact assessment, disclosure, human handover — before Develop</td></tr>`).join('')}
        </tbody></table></div>`)}
    </div>
    <div class="grid-2">
      ${section('Security & privacy', `<ul class="checklist">
        <li>Static site: no backend and no database — portfolio data stays in the viewer's browser.</li>
        <li>Content-Security-Policy allows scripts from this site only, and network calls only to <code>api.anthropic.com</code>.</li>
        <li>All data is HTML-escaped before rendering; AI output is shown as text, never as HTML.</li>
        <li>CSV export neutralises spreadsheet formula injection; imports are validated row by row and rejected rows are logged.</li>
        <li>API key held in <code>sessionStorage</code> for the tab only, never logged or persisted.</li>
        <li>Owner names pseudonymised before any model call; a preview shows exactly what is sent.</li>
      </ul>`)}
      ${section(`Policy as code — rules v${esc(RULES.version)}`, `<pre class="rules">${esc(JSON.stringify(RULES, (k, v) => (v instanceof RegExp ? v.source : v), 2))}</pre>`, '<span class="small muted">js/rules.js</span>')}
    </div>`;
}
