# Operating model: the Strategic Portfolio Office

This document describes the operating model that the application implements. It is written for executives and transformation leads, not developers.

## 1. Mandate

A lightweight function with real performance focus. **It prepares and enforces; the CEO and CFO decide.** The office has authority over process and rigour, never over the decision itself. Decision rights stay where they are.

| The office does | The office does not |
|---|---|
| Keeps one prioritised, business-cased list of all initiatives | Own or run the initiatives |
| Enforces business cases and tracks topline and bottomline impact against plan | Approve budgets |
| Prepares SCALE / CONTINUE / REVISE / STOP calls with evidence | Make those calls |
| Maps dependencies and capacity across initiatives and countries | Allocate people |
| Runs the cadence, the KPIs and one portfolio dashboard | Add a reporting layer that drives no decision |

## 2. Structure: four layers, one thread

```
STRATEGY   →  group strategy: where to play, how to win
PORTFOLIO  →  one prioritised, business-cased set of initiatives
PROJECTS   →  delivery through a stage-gate toolbox
VALUE      →  net sales, EBITDA and operational impact, tracked
```

The office spans all four layers. It is the thread that connects strategy to value that has actually been delivered.

**Governance bodies:** CEO and CFO as portfolio owner and decision body · one sponsor per initiative · sub-steering committees where delegation is needed.

## 3. Central vs local

| Tier | What it is | Ownership |
|---|---|---|
| **Group pilot** | Designed, piloted and proven centrally before it scales | Group PMO, CEO and CFO |
| **Local rollout** | A country adopts a proven group initiative and adapts it rather than reinventing it | Country, with group PMO oversight |
| **Local project** | A genuinely local need | Country, reported centrally |

## 4. Stage gates and the four calls

`Ideate (why) → Explore (what) → Develop & Realise (how)`

At every gate, funds and people are released **only for the next phase**, and one of four calls is made:

| Call | Meaning | Default rule in this app (`js/rules.js`) |
|---|---|---|
| **SCALE** | Proven: invest more, accelerate | Green on time, cost and scope; value KPI ≥ +8% vs plan; in Develop or Realise |
| **CONTINUE** | On track: release the next phase | No other rule applies |
| **REVISE** | Off track: fix scope, cost or plan | Any red dimension, value ≤ −10%, or spend > +15% over the phase budget |
| **STOP** | The case no longer holds: free the resources | Value ≤ −40%, or fit ≤ 2/5 with more than 6 months without a business case |

The rules start the conversation. A person can override any call, but the override needs a written rationale, which is logged and shown on the board report.

## 5. Financial discipline: every initiative carries a P&L story

1. **Business case at entry.** Expected net sales, EBITDA effect and payback, stated before an initiative may pass Explore.
2. **Topline and bottomline split.** Impact is expressed the way leadership steers, with assumptions stated.
3. **Plan vs actual.** Promised value is tracked through the year, so variances stay visible.
4. **Benefits realisation.** Value is confirmed with Finance after delivery, not just projected on a slide.

## 6. Prioritisation

Every initiative is scored 1–5 on four dimensions:

| Dimension | Weight | Direction |
|---|---|---|
| Strategic fit | 30% | higher is better |
| Value | 35% | higher is better |
| Effort and resources | 20% | inverted |
| Risk and readiness | 15% | inverted |

The weighted score is rescaled to 0–100. Mandatory (regulatory) initiatives have a floor of 70. Impact (fit and value) against effort (effort and risk) places each initiative in one of four quadrants: **quick wins, big bets, fill-ins, question**.

## 7. KPI framework, in three tiers

| Portfolio KPIs | Project KPIs | PMO KPIs |
|---|---|---|
| Value delivered vs plan (net sales, EBITDA) | Milestone adherence and RAG status | Reporting timeliness and completeness |
| % of initiatives on track | Budget vs actual by phase | Decision cycle time |
| Benefits realised vs promised | Business-case KPIs | Forecast accuracy |
| Resource utilisation vs capacity | Open risks and issues | Stakeholder satisfaction |

## 8. The monthly cycle: AI-assisted, human-decided

| Step | Agent | Human |
|---|---|---|
| 1. Request | Sends each owner a pre-filled status request | – |
| 2. Collect | Gathers replies and chases missing reports automatically | Owners submit their updates |
| 3. Review | Checks for gaps, staleness, missing business cases, overdue gates, self-reported status vs finance actuals, and instruction-like text | – |
| 4. Consolidate | Builds the draft pack: exceptions, recommendations, summary | – |
| 5. Dashboards | Refreshes the views and flags KPIs below plan | – |
| 6. Sign-off | – | The PMO lead checks the figures, reviews the findings, accepts or overrides each call, and approves or returns the pack |

**Why it works:** the same rigorous process runs every month, days of admin shrink to minutes, and people spend their time on decisions instead of chasing updates.

## 9. Design principles

1. **Lightweight.** If a step doesn't drive a decision, it is cut.
2. **Self-funding.** No new headcount. The office pays for itself by protecting value and freeing capacity.
3. **Executive-anchored.** Owned by the CEO and CFO, so it survives any one person leaving.
4. **AI-augmented.** Automation absorbs the admin, so the function stays small and never becomes a bottleneck.
5. **Embedded, not bolted on.** It runs on the existing toolbox, cadence and systems.

## 10. Roadmap template

| Phase | Focus |
|---|---|
| **Design and align** | Confirm the mandate and scope · refresh the toolbox and templates · build the agent (v1, reporting only) |
| **Launch** | Baseline and prioritise the portfolio · business-case every initiative · run the first monthly review |
| **Embed** | Run the cadence end to end · put dashboards and KPIs live · take the first quarterly portfolio decisions |
| **Mature** | Scale the dependency and capacity views · put the agent fully in the loop · track benefits realisation |
