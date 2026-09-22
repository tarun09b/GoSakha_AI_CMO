# 08 — UI Design System

Derived from the published Command Center specification. Use these tokens consistently across every dashboard module so the system reads as one product, not 21 separate screens.

## Color tokens (light)
| Token | Hex | Use |
| --- | --- | --- |
| `--bg` | #F2F4F1 | Page background |
| `--panel` | #FFFFFF | Cards, tables |
| `--panel-2` | #EAEFE9 | Table headers, secondary surfaces |
| `--ink` | #16241F | Primary text |
| `--ink-soft` | #445048 | Secondary text |
| `--line` | #D7DED7 | Borders |
| `--teal` | #0E6E5A | Primary accent (brand, links, live indicators) |
| `--teal-deep` | #0A4F42 | Headings, active nav |
| `--rust` | #B8562B | Hot / urgent |
| `--amber` | #A67A17 | Warm / needs-review |
| `--cool` | #4A7A9E | Cool / informational |

Dark mode mirrors these with inverted lightness (see published artifact's `@media (prefers-color-scheme: dark)` block).

## Typography
- **Headings:** Spectral (serif) — carries editorial/clinical-trust personality, distinct from generic SaaS sans defaults.
- **Body & data:** IBM Plex Sans — technical, legible, systems-appropriate for a dashboard used by engineers and operators alike.
- **Labels/code/mono data:** IBM Plex Mono — event types, IDs, metric labels.

## Layout
- Four-zone shell: top bar (persistent KPIs/filters) · left nav · main column · right rail (approvals/agent health). See `03_DASHBOARD_REQUIREMENTS.md`.
- Line length under 80 characters for body copy; tables and data-dense views break this rule intentionally.
- Grid-based cards with 1px borders, not heavy drop shadows — this is an operational tool, not a marketing site.

## Components
- **KPI tile:** number + label + refresh cadence indicator; clickable, expands inline drill-down.
- **Status dot:** 5-state (`Healthy/Running/Waiting/Failed/Disabled`) — color-coded, never text-only (accessibility: pair with a label on hover/focus).
- **Temperature chip:** hot (rust left-border), warm (amber), cool (cool-blue) — consistent across Leads, KPIs, and filters.
- **Event row:** timestamp (mono) + actor + type badge + entity + message.
- **Approval card:** target, content preview, source facts, risk flag, Approve/Edit/Reject/Revise actions.

## Interaction principles
- Drill-down expands in place (slide-over or inline panel) — never a full navigation away from context.
- Loading/empty/error/permission states defined for every view; empty states are an invitation to act, not a dead end.
- Motion: reserved for one deliberate moment (e.g. a live event arriving) — no scattered hover/entrance animation on every card.
- Accessibility floor: visible keyboard focus, reduced-motion respected, color never the sole carrier of meaning (status dots pair with text labels).
