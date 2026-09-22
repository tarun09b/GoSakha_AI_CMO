# Changelog

## 2026-09-20 — Foundation repair

- Removed the public sample dashboard's dependency on an authenticated workspace request that returned 403 in production.
- Rendered fictional Sakha hospital sales seed data on the server and hydrated an isolated, mutable in-memory sample workspace.
- Prevented overlapping live workspace fetches and added a request timeout, error state and retry path.
- Added five deterministic mock workflows with records, structured events, correlation IDs and run history.
- Populated core KPI, activity, hospital, pipeline and demo views and made unfinished provider capabilities explicit.
- Grounded product and sales copy in Sakha; retained the brochure and kept internal build documents out of Products.
- Added a secure UUID fallback for browser contexts without `crypto.randomUUID`.
- Reset activity filters on navigation so they do not silently filter the Command Center feed.

No real email, post or meeting invitation was sent. No external provider or scheduler was activated. Sample changes reset when the page reloads.

## 2026-09-20 — Follow-up load resilience

- Rechecked version 6 and actual production request logs; no new server error was observed.
- Validated workspace response shape before rendering.
- Applied a deadline to both network fetching and JSON response parsing, including transports that ignore cancellation.
- Replaced initial failure KPI placeholders with an explicit recovery panel and direct sample-workspace action.
- Added eight regression tests for load success, malformed data, HTTP/network errors, hanging requests/bodies and cancellation.
