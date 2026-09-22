# GoSakha CMO AI

Complete source export of the GoSakha sales and marketing dashboard, based on published version 7 (commit `cd9aa040a41a8daac4fa470fee6b7e4cf4a7f40f`). Prepared 21 September 2026.

This console helps GoSakha sell **Sakha**, the hospital AI voice assistant. It is not the patient-call application itself. The frontend, HTTP backend, database schema/migrations, mock workflows, integration adapters, assets and tests are included.

## Start in VS Code

1. Extract the ZIP completely. Open the **GoSakha CMO AI** folder in VS Code, or double-click **GoSakha CMO AI.code-workspace**.
2. Install Node.js **22.18 or newer**; Node 24 is suitable. Restart VS Code after installing Node.
3. Open **Terminal → New Terminal** in the project root. Run:

```sh
npm install --global pnpm@11.25.0
pnpm install --frozen-lockfile
pnpm run setup
pnpm dev
```

4. Open **http://localhost:5173**. Stop the server with **Ctrl+C**.

The same commands work in Windows PowerShell, macOS and Linux. No Bash, Docker, paid AI subscription, API key, cloud database account or separate backend terminal is required for the local demo. If PowerShell blocks `pnpm.ps1`, use `pnpm.cmd` in place of `pnpm` (and `npm.cmd` in place of `npm`). Keep the dependency installation at the project root.

`setup` creates an ignored local environment file and applies the three database migrations. It is safe to run again. `dev` also initializes a new local database if setup has not been run. No real hospital data or credentials are bundled.

## Frontend and backend layout

| Folder/file | Purpose |
|---|---|
| `frontend/app/` | Dashboard, screens, layout, styles and framework routing |
| `frontend/components/` | Reusable UI components |
| `frontend/hooks/`, `frontend/lib/` | Browser helpers, bounded data loader and simulated workflows |
| `frontend/public/` | Favicon and Sakha brochure |
| `frontend/app/api/` | Five small route registration files that delegate to the backend |
| `backend/api/` | Actual API handlers: workspace, team, Gmail, operations, automation |
| `backend/services/` | Storage, permission checks, sending rules, provider adapters and run logging |
| `backend/auth/` | Hosting identity adapter |
| `backend/db/`, `backend/drizzle/` | Database schema and all migrations |
| `backend/.env.example` | Blank server configuration template |
| `shared/` | Types, record mutations, business rules and product facts used by both sides |
| `tests/` | 68 automated tests using Node's built-in runner |
| `docs/` | Audit, limitations, integration instructions and build knowledge |
| `docs/original-sites/` | Original hosting configuration/helpers kept for provenance; not the local setup path |
| `scripts/` | Cross-platform setup, build and test commands |
| `pnpm-lock.yaml` | Reproducible dependency versions |

One server hosts both UI and `/api/*` under the same origin. This preserves the existing React/Vinext/Cloudflare architecture and avoids a second server, CORS configuration and duplicated installs. Backend implementations are in `backend`; framework route bridges in `frontend/app/api` are required by the router.

## What you can use now

- **Sample workspace** opens with 8 fictional hospital prospects, 3 hot leads, 2 upcoming Sakha demos, 2 approvals and 4 activity events.
- Hospital, pipeline, demo, draft and approval details/actions use the existing typed record model.
- Live Activity can run five deterministic mock workflows: Email Outreach, LinkedIn, Instagram, CRM and AI CMO. These create real in-memory records/events, without contacting external providers.
- All 19 navigation modules contain data/content or explicit later-phase notices.
- **My workspace** uses the local D1 emulator and persists to `.local/state/`. It starts empty: add your own fictional test hospital to check persistence.
- Development uses a local Preview operator identity. It does not sign into your real ChatGPT account or load the online dashboard's private data.

**Sample changes reset on reload.** Local saved workspace records survive restarts until `.local/state/` is deleted. Local and online databases are separate.

## Commands

| Command | Result |
|---|---|
| `pnpm run setup` | Create local environment file and initialize/migrate the local database |
| `pnpm dev` | Start UI and API together on port 5173 |
| `pnpm test` | Run all automated tests; provider calls are mocked |
| `pnpm run typecheck` | Check TypeScript without emitting files |
| `pnpm build` | Build frontend assets and the server Worker into `frontend/dist/` |
| `pnpm start` | Serve the built Worker locally on port 8787 |
| `pnpm run db:migrate` | Apply additional existing local migrations |
| `pnpm run db:generate` | Generate migrations after intentional schema changes |

For another development port: `pnpm dev -- --port 5174`. VS Code also includes setup, development, tests and build tasks under **Terminal → Run Task**.

The built preview (`pnpm start`) has no development identity. Public sample mode works; private workspace sign-in requires a trusted production identity integration. Use `pnpm dev` to test local saved-workspace actions.

## Configuration and integrations

The first setup copies `backend/.env.example` to **`frontend/.dev.vars`**. Edit that generated file only if connecting providers. Restart the server after changes. Keep credentials server-side; the template intentionally contains no values. No `.dev.vars`, tokens, saved user records, `node_modules` or build caches are included in the ZIP.

Existing adapters cover Gmail, Google Calendar, LinkedIn, Instagram, Claude and Brave Search. They still require provider credentials, approved permissions and live verification. Automatic email reminders need a configured scheduler; none is created by these local commands. Template/rule-based mock logic is not a connected language model.

Read `docs/LOCAL-AND-DEPLOYMENT.md` and the existing integration guides before connecting or deploying. Sakha's official plan prices/limits have not been supplied and are not invented in the product view.

## Resource usage

- Sample mode performs no workspace polling and no AI/provider calls. Local running consumes your computer's resources, not ChatGPT credits.
- One dependency installation and one app server serve both folders.
- Tests use Node's built-in runner. No additional testing service is needed.
- Reuse the lockfile; avoid reinstalling on every start. `pnpm` caches dependency downloads.
- Paid API usage begins only after you intentionally configure and execute those integrations. Hosting/provider charges depend on the service and usage; this package does not promise free cloud deployment.
- My workspace preserves the existing four-second polling behavior. Close idle tabs when testing it. For larger teams, replace polling with durable events or change the refresh interval after measuring usage.

## Troubleshooting

| Problem | Fix |
|---|---|
| `node` or `pnpm` not found | Install Node, restart VS Code, then install the pinned pnpm version above |
| Missing packages | Run `pnpm install --frozen-lockfile` in this root folder |
| Missing table / storage unavailable | Stop dev; run `pnpm run setup`; start dev again |
| Port already used | Stop the other GoSakha terminal, or use `pnpm dev -- --port 5174` |
| Old dashboard visible | Check localhost rather than the published site; refresh the browser |
| Empty My workspace | It is a separate local database. Use Sample workspace for seeded records |
| Loading API fails | The loader times out after 10 seconds and offers Retry or Open sample workspace |
| Real account connection fails | The local demo does not include your hosted account session or OAuth credentials |

Do not run the archived `docs/original-sites/scripts` as the setup procedure. The root commands above are the supported path for this reorganized export.
