# AI governance: how the PMO agent is controlled

> The regulatory mapping in this document is indicative. It illustrates a governance approach and is not legal advice. Before deploying a comparable system, confirm its classification and obligations with your legal and data-protection functions.

## 1. System card

| | |
|---|---|
| **System** | PMO portfolio agent. It collects, checks and consolidates initiative status and drafts the monthly portfolio report. |
| **Intended purpose** | Decision *support* for portfolio governance: evidence and recommendations for the CEO and CFO. |
| **Out of scope** | Taking or executing decisions; evaluating, ranking or monitoring employees; writing to source systems. |
| **Users** | PMO lead (reviewer, sign-off) · initiative owners (input) · CEO and CFO (recipients) |
| **Components** | A deterministic rules engine that makes every recommendation · an optional general-purpose LLM that drafts narrative text only |
| **Inputs** | Status updates, finance actuals, KPI values, business cases, capacity plans |
| **Human oversight** | Sign-off by a named reviewer with a checklist · overrides with a mandatory rationale · nothing circulates unreviewed |
| **Known limitations** | Only as good as its inputs. The rules can miss context a person knows. LLM text can contain errors, so it is checked and signed off. |

## 2. Why the architecture is split

The most important governance decision is architectural. The **language model has no decision authority.**

```
Status updates ─┐
Finance actuals ─┼─► Rules engine ──► Flags, gate calls, scores ──┐
KPI data ───────┘    (deterministic,                              ├─► Draft pack ─► Human sign-off ─► Board
                      versioned, tested)                          │
                                         Pseudonymised facts ─► LLM ─► Narrative draft ─► Grounding check
```

- Every recommendation can be explained from one rule in one file (`js/rules.js`) and is covered by unit tests.
- The model sees only report-level facts with owner names replaced by tokens. It writes prose and cannot change any call.
- If the model is unavailable, the system falls back to a template narrative built from the same facts.

## 3. EU AI Act: indicative classification

| Question | Assessment |
|---|---|
| Prohibited practice (Art. 5)? | No. There is no manipulation, social scoring or biometric processing. |
| High-risk under Annex III? | No. It supports decisions about *projects and budgets*. Using it to evaluate or monitor *people* would fall under Annex III(4) (employment), so that use is excluded by design (control GOV-11). |
| Transparency (Art. 50)? | The text is for internal decision support, not public-interest publishing. AI-generated text is labelled anyway (GOV-05). |
| General-purpose AI model? | Used through a provider API. Model-level obligations sit with the provider; deployer duties (such as Art. 4 AI literacy) sit with the company. |
| **Result** | **Minimal / limited risk.** Controls modelled on the high-risk requirements (Art. 9–15) are applied **voluntarily**, in proportion to the decisions the system informs. |

## 4. Control framework

| ID | Control | Implementation | EU AI Act | ISO/IEC 42001 Annex A | NIST AI RMF |
|---|---|---|---|---|---|
| GOV-01 | Human sign-off before circulation | Named reviewer plus a three-point checklist; approve or return | Art. 14, 26 | A.9 Use of AI systems | Govern · Manage |
| GOV-02 | Decision authority stays with people | Rules engine makes the calls; the LLM drafts prose only | Art. 14(4) | A.9 | Map · Manage |
| GOV-03 | Override with mandatory rationale | Rationale required, logged and shown on the report | Art. 14(4)(d) | A.9 | Manage |
| GOV-04 | Tamper-evident audit trail | SHA-256 hash chain, verification and export | Art. 12 | A.6.2.8 Event logs | Measure · Manage |
| GOV-05 | AI content labelled | Visible label in the app and the report; model logged | Art. 50, 13 | A.8 Information for interested parties | Govern · Measure |
| GOV-06 | Grounding check | Every number in the AI draft is matched against the facts sent | Art. 15 | A.6 Life cycle (verification) | Measure |
| GOV-07 | Data minimisation and pseudonymisation | Only report-level facts are sent; names are tokenised and restored locally | Art. 10 · GDPR Art. 5(1)(c), 25 | A.7 Data for AI systems | Map · Manage |
| GOV-08 | Prompt-injection containment | Pattern detection, data wrapping, no tools or write access | Art. 15(5) | A.6 | Measure · Manage |
| GOV-09 | Input data-quality checks | Completeness, staleness, business case, RAG vs actuals | Art. 10 | A.7 | Measure |
| GOV-10 | Policy as code, versioned and tested | One rules file, with unit tests run in CI | Art. 11, 13 | A.6 | Govern · Measure |
| GOV-11 | Scope limited to projects, not people | No person-level scoring; owners are used for routing only | Art. 6, Annex III(4) | A.5 Impact assessment | Map |
| GOV-12 | Third-party model provider | Deployer's own key; provider terms, retention and region reviewed | Art. 25, 53 | A.10 Third-party relationships | Govern |
| GOV-13 | Application security baseline | CSP, escaping, CSV formula neutralisation, key held for the session only | Art. 15 | A.6 | Manage |
| GOV-14 | AI literacy | Reviewers trained on the system card, its limits and automation bias | Art. 4 | A.4 Resources · cl. 7.2 | Govern |

## 5. AI risk register

| Risk | Likelihood | Impact | Mitigation | Residual |
|---|---|---|---|---|
| Ungrounded or invented figures in the AI draft | Medium | High | GOV-06 grounding check, rules-based fallback, GOV-01 sign-off | Low |
| Automation bias: reviewers rubber-stamp the pack | Medium | High | Checklist, visible rule and reasons, mandatory override rationale, AI literacy | Medium |
| Prompt injection through status text | Medium | Medium | GOV-08; the model cannot alter calls (GOV-02) | Low |
| Personal data sent to the provider | Low | Medium | GOV-07, consent notice, GOV-12 | Low |
| Green-washing in self-reported status | High | High | GOV-09 cross-check against finance actuals and KPIs | Medium |
| Stale or missing reports | Medium | Medium | Stale and missing checks, auto-chase, completeness KPI | Low |
| Use drifts into judging individuals | Low | High | GOV-11 documented out-of-scope use | Low |
| Rule thresholds mis-calibrated | Medium | Medium | GOV-10 versioning and tests, quarterly review with the CFO | Low |

## 6. AI inventory

The portfolio office also tracks AI systems that *initiatives* build. Each one gets an impact assessment before it passes the Develop gate. In the sample portfolio, the **AI Service Assistant** (a customer-facing GenAI chatbot) is indicatively **limited risk**: under Art. 50(1), users must be told they are talking to AI. Its gate requirements are an AI impact assessment, disclosure to users and a handover path to a human.

## 7. Rolling this out in a real organisation

1. Start with **reporting only**: no model calls, rules engine plus sign-off. Build trust with the deterministic part.
2. Add the LLM narrative **after** a data-protection review of the provider (contract, retention, region) and a DPIA if your data protection officer requires one.
3. Calibrate the thresholds with the CFO every quarter. The rules file is the single place to change them.
4. Put the audit log under your records-retention policy.
5. Expand the agent's scope (for example, reading finance actuals directly) only through the same stage gates the portfolio itself uses.
