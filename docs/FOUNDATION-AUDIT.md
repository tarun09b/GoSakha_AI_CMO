# GoSakha foundation audit and repair

Date: 2026-09-20. Scope: current source and production diagnostics, followed by browser verification of the repaired preview. This report supplements the earlier QA review.

## Pre-repair finding

Production requests to `/api/workspace?mode=sample` returned 403 without an authenticated identity. The public sample screen initially had no records and depended on this protected API. The source already contained a typed model, fictional seeds, D1 JSON workspace persistence and mutations: it was not entirely a hardcoded shell. Overlapping polling had no request timeout. Authentication for real workspace data must remain enforced.

The following audit was reported before source changes. “Blocked” means that underlying code existed but the reported public sample loading failure prevented normal use.

| Module | Working / Shell-only / Missing | What was actually needed |
|---|---|---|
| Command Center | Shell-only while blocked | Load seed state without private API dependency; derive KPIs from records. |
| Live Activity | Shell-only while blocked | Populate events; execute mock workflows; add structured metadata and filters. |
| Hospitals & Leads | Working model, blocked UI | Load fictional prospects and verify detail views. |
| Pipeline | Working model, blocked UI | Render the same prospect records by sales stage. |
| Demos | Working model, blocked UI | Load upcoming Sakha demos with dates and hospital decision-makers. |
| Email Outreach | Working draft logic, blocked UI | Seed/model access; distinguish drafts from live Gmail sending and scheduling. |
| Gmail Inbox | Missing live connection | Explicit Phase 8 state; authenticated Gmail adapter and credentials later. |
| LinkedIn | Working draft/review logic only | Executable mock workflow; clearly state live publishing is not built. |
| Instagram | Working draft/review logic only | Executable mock workflow; clearly state live publishing is not built. |
| Content Studio | Working templates, blocked UI | Data access and honest template-only labeling. |
| Campaigns | Working records, blocked UI | Sample operational data; later campaign intelligence explicitly unfinished. |
| Trends | Manual records only | Data access; distinguish manual input from future trend discovery. |
| AI CMO Brain | Working rules only | Load operational data; execute and label deterministic plans. |
| Approvals | Working model, blocked UI | Load review queue and keep approval controls. |
| Agent Center | Partly shell/status labels | Actual mock run history; stop implying unconnected agents are active. |
| Analytics | Working calculations, blocked UI | Compute from sample records, with sample/live distinction. |
| Products & Knowledge | Static product content | Correct Sakha SaaS positioning, features and unconfirmed commercial tiers. |
| Integrations | Configuration/status only | Render sample disconnected states; verify live credentials later. |
| Settings | Working preferences, blocked UI | Sample mutation support; real identity and tenant checks remain separate. |

## Repairs and observed evidence

1. Phase 3 sample foundation: SSR initializes 8 prospects, 3 hot leads, 2 upcoming demos, 2 pending approvals and 4 activity events. Browser rendering showed those values, not dashes. Fictional records use example.com contact addresses. Sample mutations are in-memory and reset on reload. Real workspace APIs remain protected.
2. Phase 4 shell: browser visited all 19 modules and found the correct heading and content without the opening spinner. Hospital and demo detail dialogs showed actual selected record values. Later phases have explicit not-live notices. Products lists Sakha's capabilities and explains that this console sells the product; it does not handle patient calls. Official plan names/prices have not been invented.
3. Phase 5 activity: all five mock providers executed in the browser. Email generated three review drafts; social workflows generated channel drafts; CRM generated a demo; AI generated a rule-based plan. Approvals changed from 2 to 5 and upcoming demos from 2 to 3. Agent Center displayed five completed runs. Event details displayed simulation status and matching workflow/correlation IDs. Filtering Instagram returned its run and draft events.
4. Browser testing exposed unavailable `crypto.randomUUID` on the HTTP preview. A `crypto.getRandomValues` UUID fallback fixed the failure and all five workflows were rerun successfully.

## Limits and next phase

This is functional simulated data, not real hospital activity. No credentials or external scheduler are configured. No email, social post or invitation was sent. Rule/template logic is not an external LLM. Sample state is not durable or shared across users. Live signed-in tenant persistence and provider integrations were not verified in this pass. Existing protected D1 JSON storage is not a completed normalized Postgres schema; polling is not SSE.

Complete the production data/persistence and real-time acceptance criteria before calling the full production Phase 3/5 finished. The next module phase is Phase 6 product/hospital knowledge, with confirmed Sakha plan tiers and terms. Do not expand agent screens without a working mock adapter or a clear unavailable state.

## Follow-up load audit — version 6, 2026-09-20

The follow-up user report was checked against the currently published version 6 before editing. Recent production logs contained no errors. The following actual request records were observed (UTC):

| Time | Request | Status | Duration | Request ID |
|---|---|---|---|---|
| 18:05:06.325 | GET /api/workspace?mode=sample | 200 | 695 ms | 333c073c5674566e8b0b4b8b53566eac |
| 18:05:17.215 | GET /api/workspace?mode=sample | 200 | 275 ms | 49cf2ff363616d91ccfa5d2002d591b4 |
| 18:05:20.076 | GET /api/workspace?mode=sample | 200 | 383 ms | d6a494c596c0f7b3ec761cf96c122f1f |
| 18:05:26.351 | GET / | 200 | 32 ms | 916d4edd6dc1699ef9db8034a1e6ce2e |

These logs do not prove what the user's open browser tab rendered. In particular, an old tab or cached client is a possibility, not an established diagnosis. The earlier 403 observation must not be presented as a new failure observed in this follow-up. No current CORS or missing-endpoint error was observed.

The old client fetched `/api/workspace?mode=sample` on startup. Version 6 sample mode has no workspace startup fetch: `app/page.tsx` passes `initialState(true)` directly to the client. Selecting My workspace makes `GET /api/workspace?mode=live`. A fresh browser preview of that published source rendered 8 prospects, 3 hot leads, 2 demos, 2 approvals and four seed events. A screenshot was shown to the user. The local live-workspace path also resolved successfully with zero records under the development Preview operator identity; this is not proof of production sign-in.

Additional hardening: workspace responses are validated before entering React state; HTTP status and server messages are retained in visible errors; a deadline bounds both network and JSON-body parsing even if abort is ignored. When initial loading fails, KPI placeholders are replaced by an explicit unavailable panel offering Retry workspace and Open sample workspace. A request failure cannot silently present empty records as successfully loaded data.

Validation: 68 automated tests passed, including network rejection, HTTP 403, non-JSON HTTP 502, malformed successful JSON, a never-resolving request, a never-resolving body, and cancellation. These failure cases were injected in tests, not claimed as new production incidents. All 19 sidebar destinations were checked again in the browser. The sample remains fictional and resets on reload; live external agents and production persistence verification remain outstanding.
