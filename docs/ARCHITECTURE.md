# Architecture

## Goals

- **Zero-install demo.** A static site anyone can open from a link, hosted on GitHub Pages.
- **Auditable.** Plain JavaScript modules with no build step and no third-party runtime code, so every line that runs can be read in this repository.
- **Deterministic core.** The same input always produces the same flags and recommendations.
- **Optional AI.** The app is complete without a model; the LLM improves the prose but is never required for a decision.

## Modules

| File | Responsibility |
|---|---|
| `js/data.js` | Synthetic sample portfolio (fictional company) |
| `js/rules.js` | Policy as code: thresholds, weights and injection patterns, versioned |
| `js/engine.js` | Pure functions: `reviewInitiative`, `recommend`, `priority`, `capacityMatrix`, `dependencyAnalysis`, `analyse` |
| `js/narrative.js` | Template executive summary built from engine output |
| `js/llm.js` | Optional Claude call with fact-building, pseudonymisation, grounding check and re-identification |
| `js/audit.js` | Hash-chained audit log (Web Crypto SHA-256) |
| `js/csv.js` | Status request export and returned-status import, with validation and formula neutralisation |
| `js/store.js` | State persistence in `localStorage`, guarded so the app works without storage |
| `js/app.js` | Hash router, theme and shell |
| `js/views/*.js` | One module per page, each exporting `render(ctx)` and optionally `bind(ctx)` |

## Data flow

```
data.js ─► store.js (state) ─► engine.analyse() ─► views
                    ▲                  │
       CSV / JSON import         llm.draftNarrative()  (optional, user's key)
                    │                  │
                audit.js ◄─────────────┘  every agent step and human action
```

## Model call

`POST https://api.anthropic.com/v1/messages`, called directly from the browser with the viewer's own key (`anthropic-dangerous-direct-browser-access`). The default model is `claude-opus-5-5`, with low effort because this is a short drafting task. Server-side fallbacks are requested where supported, and the call is retried without them if the request is rejected. A `refusal` stop reason surfaces as an error, and the template narrative stays in place.

In production, route the call through a server-side proxy that holds the key and applies organisation policy (logging, data-loss prevention, model allow-list). The browser call exists only so a public demo needs no backend.

## Tests

`npm test` runs `node:test` suites against the pure modules:

- engine: status logic, each gate rule, review checks, ranking, priority bounds, capacity peak, bottleneck and cycle detection, determinism
- controls: audit tamper detection, CSV validation and formula neutralisation, no personal data in model payloads, grounding check, request shape, fallback retry and refusal handling (with a mocked `fetch`)

CI runs the tests on every push. GitHub Pages deploys the site from `main`.
