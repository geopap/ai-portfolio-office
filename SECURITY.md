# Security

## Design

- **Static site, no backend.** Portfolio data and app state live only in the viewer's browser (`localStorage`). Nothing is sent anywhere unless the viewer chooses to use the optional AI narrative.
- **Content-Security-Policy.** Scripts load only from this site. The only allowed network destination is `api.anthropic.com`. Objects and base-URI changes are blocked.
- **Output encoding.** All dynamic text is HTML-escaped before rendering. AI output is shown as text, never as HTML.
- **Input validation.** CSV and JSON imports are size-limited and validated, and invalid rows are rejected and logged rather than partially applied. CSV exports neutralise spreadsheet formula injection.
- **API key handling.** The viewer's Anthropic key is kept in `sessionStorage` for the current tab only. It is never logged, persisted or sent anywhere except the Anthropic API.
- **Personal data.** Owner names are replaced with tokens before any model call and restored locally.
- **Prompt injection.** Free-text updates are scanned for instruction-like content, wrapped as untrusted data and flagged for human review. The model has no tools and no write access.

## Reporting a vulnerability

Please open a private security advisory on this repository (Security → Advisories → Report a vulnerability) rather than a public issue.
