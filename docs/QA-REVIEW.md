# GoSakha dashboard quality review — 20 September 2026

## Method and evidence
Two independent read-only reviews covered UI interactions and authorization/lifecycle logic. The main implementation pass corrected confirmed defects. A second security review checked the changes. The final automated suite passes 52 tests, including mocked provider contracts; TypeScript checks pass.

## Corrected defects
- Top Workspace control now opens a workspace menu; lower-left profile opens Account & team.
- Founder-owned workspaces have explicit membership roles; member access is checked server-side on each request. Only founders can grant or revoke access. Selection cookies cannot grant membership. Revocation overrides legacy configured grants.
- Existing records determine permissions: client-supplied record kinds no longer bypass Sales or reviewer limits.
- Every credentialed provider requires a configured workspace owner.
- Sending and uncertain delivery reservations survive replies, opt-outs and archive operations. Erasure is blocked during pending or uncertain external actions, including derived records and calendar invitations.
- Calendar outcomes cannot overwrite unresolved invitation reservations. The final email preflight checks newly arrived replies, sequence stops and disabled agents.
- Erasure removes associated plans and delegated records; old plans without provenance are conservatively removed.
- Disabled Content Studio blocks stored-post edits/submissions and delegated post generation. LinkedIn cannot publish via an Instagram preparation action.
- Pipeline column creation preserves its stage. Lead search includes email. Social search has a no-results state. Archived hospitals are omitted from new outreach/meeting choices.
- Browser Back/Forward navigation is supported. Workspace switches clear stale filters and record details. Duplicate workspace mutations are guarded.
- Account layouts adapt to phone width; corner controls have larger touch targets, keyboard focus and existing reduced-motion support. Operations errors include retry feedback.

## Browser checks completed
Desktop: both workspace modes remain isolated; top selector opens; lower-left account opens; top account menu opens and navigates; Back/Forward restore the proper view; all 22 page destinations visited; email filtering and social no-results checked; sample hospital created from Interested column and verified after reload; sequence creates three approval drafts; record and review panels open; a sample email was approved and simulated successfully without external delivery. Mobile: at a 390px frame (375px content), the account page has equal client/scroll widths; navigation opens and closes after choosing Account & team.

## Limits
This is a focused release audit, not a certification that every possible browser, role and provider combination has been tested. Provider contracts are mocked: real Gmail, social publication, calendar invitations, AI/research and unattended schedules need configured credentials and live acceptance checks. External sign-in was not completed in the test browser.
A browser attempt to submit a local sample team grant was blocked by automatic approval review because a specific recipient and access scope had not been authorized. No grant was made and the rejection was not bypassed. Team grant/revoke UI persistence and a real second-account session therefore remain unverified; the role policy is covered by automated tests and independent source review.

## Design comparison applied
- Apple UI Design Dos and Don’ts: clear hierarchy, visible feedback, comfortable hit targets. https://developer.apple.com/design/tips/
- Google Android accessibility guidance: named controls and larger touch targets (platform guidance adapted to the web, not a claim of native compliance). https://developer.android.com/guide/topics/ui/accessibility/apps
- HubSpot Sales Hub: clear prospecting actions and pipeline context, reflected in the focus queue and linked hospital/approval workflow. https://www.hubspot.com/products/sales

No performance or feature-equivalence claim is made against these products.
