# Gmail and background follow-up setup

The Site is deployed as an owner-private working pilot. No credentials are committed. Never put credentials into hospital notes, drafts or the browser bundle.

## Implemented endpoints

- GET/POST /api/workspace: owner-authenticated durable operations with optimistic revisions. Live and sample namespaces are isolated per authenticated Site user.
- GET /api/gmail: reports whether the current user is assigned the configured mailbox.
- POST /api/gmail: actions health, sync, send. Requires authenticated mailbox owner. Send body includes a saved approved email id; the server resolves recipient/content from storage, never from client-supplied message text.
- POST /api/automation: bearer-authenticated scheduler. Syncs known outbound threads, then processes at most five due approved messages. Each send rechecks gates. Use a scheduler that can reach the private Site, or a platform-supported authenticated service path; do not make the Site public merely to reach this endpoint.

## Required runtime settings

Configure with the Site's server-side environment controls:

- GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET: your authorized Google OAuth application.
- GOOGLE_REFRESH_TOKEN: offline consent for the dedicated business mailbox. Gmail readonly + send scopes. Do not authorize a patient inbox.
- GMAIL_SENDER: exact account email returned by the Gmail profile endpoint.
- CMO_OWNER_USER_ID: the authenticated Site user id assigned to this mailbox (obtain from the trusted authenticated request server-side; never trust a submitted id).
- AUTOMATION_SECRET: long random bearer secret used exclusively by the scheduler.

Refresh and verify Gmail from Integrations. Configuration is not proof of a successful send. Complete the tests below before treating the integration as operational. The browser currently shows the verified connection for the session, based on a real profile response; after reload verify again.

## Gmail implementation details and limits

MIME/base64url mail is generated server-side. Every send requires a recorded approval, a due time, an active sequence, a non-opted-out contact and capacity under the daily cap (Asia/Kolkata). Follow-up dates are calculated after the previous send is confirmed. A reply stops the sequence and creates a review record; inbox content is deliberately not imported. Positive/objection/unsubscribe/bounce classification is recorded by a human. A transport error creates Delivery uncertain and blocks automatic retries. Investigate Gmail using the stable Message-ID before deciding the next recovery step; no blind resend control exists.

The code does not track delivered/opened status or claim opens from Gmail sends. Google Calendar, LinkedIn, Meta, research and LLM integrations remain future work. This pilot's polling activity stream is 4 seconds, not WebSocket/SSE.

## Verify before enabling a recurring job

1. Test with a controlled business recipient and explicit user approval. Confirm sender identity.
2. Verify outbound approval bypass is blocked; email sends once and provider ID is stored.
3. Confirm a reply stops all later steps, including an already-approved reminder.
4. Verify opt-out, pause, disabled Gmail/Outreach agents, daily cap, future due date, and concurrent job rejection.
5. Verify the scheduler can authenticate through the owner-private hosting boundary. If not, use a supported platform service-auth option; do not weaken privacy to enable it.
6. Verify ambiguous delivery is not retried. Keep a manual reconciliation procedure.
7. Start with a small internal approval-only pilot. The supplied source pack's later rollout gates remain unmet.

Official implementation references:
- https://developers.google.com/workspace/gmail/api/guides/sending
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/list
