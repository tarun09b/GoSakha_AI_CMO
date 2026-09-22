# Local runtime and deployment notes

## Runtime

The UI uses React and TypeScript with Vinext (Next-style App Router on Vite). API handlers execute in a Cloudflare Worker runtime. The local Cloudflare emulator provides a SQLite-backed D1 database; no Docker or independent database process is needed.

The project is organized by responsibility, not split into two independent services. `frontend/app/api/*/route.ts` only registers backend handlers with the app router. Actual backend code lives in `backend/api` and `backend/services`; it is built into the server bundle, not sent to the browser. Shared data structures and safe deterministic rules live in `shared`.

`pnpm run setup` and the Vite plugin use the same database binding (`DB`), local database ID and `.local/state` persistence directory. Three migrations create `workspaces`, `agent_runs` and `workspace_members`. Workspace payloads are versioned JSON with optimistic revision checks. This is the existing database design, not a newly normalized SQL CRM schema.

The entry point `frontend/app/page.tsx` renders seeded state. Selecting Sample workspace mutates browser memory. Selecting My workspace uses the API and the local database. The package does not download or include hosted records.

## Authentication

Local development has an explicit development identity. The preserved Sites plugin also offers a loopback-only simulated sign-in route; it does not authenticate a real ChatGPT account. Never expose the development server as a public application.

The original hosted app receives identity headers from the Sites gateway. A standalone Cloudflare or other-host deployment does not automatically have that gateway. This export therefore ignores those headers in production unless the server environment explicitly sets `GOSAKHA_AUTH_PROVIDER=sites`.

Only set that value on an actual Sites deployment where the trusted gateway sets and protects the headers. For other hosting, implement a verified session/OIDC adapter in `backend/auth/chatgpt-auth.ts`; derive identity from the verified session, not caller-supplied headers. Until then, the built standalone preview supports public sample mode and blocks private workspace APIs. No local fallback identity is enabled in production builds.

## Build and local production preview

```sh
pnpm run typecheck
pnpm test
pnpm build
pnpm start
```

Open http://localhost:8787 for the built sample dashboard. The artifact is under `frontend/dist`: `client` contains public assets, and `server` contains the Worker entrypoint/configuration. Use the generated server Wrangler configuration for a built preview, not the migration-only configuration in `backend/wrangler.json`.

## Publishing

The ZIP does not deploy or change the existing Site. `docs/original-sites/.openai/hosting.json` records its project ID for provenance; the working export configuration intentionally has no project ID, so it cannot silently target that live application.

For Sites: bring this export into the site's supported build/publish workflow, select the existing project deliberately, provide the trusted auth mode and server-side provider settings, and preserve its audience. The build includes logical hosting declarations and the current SQL migrations. Folder relocation means the framework root is `frontend`, not the repository root.

For an independent Cloudflare account: create your own Worker and D1 database, replace the local placeholder database identifier in the build configuration with the real binding using a separate deployment configuration, apply the migrations to that database, and publish the generated Worker/assets. Add trusted authentication before enabling private workspace access. Do not deploy the local placeholder DB configuration as a finished production backend. Provider tokens belong in the hosting service's secrets store. This export intentionally has no one-click public deployment command for an account that has not been configured.

Cloud costs depend on requests, storage, execution and provider plans. Sample mode needs no third-party AI or marketing API. Paid integrations and autonomous schedules are opt-in configuration work and remain unverified in the exported project.

## Scope retained from version 7

- Hospital sales CRM, pipeline, demos, approvals and sample activity.
- Five deterministic mock workflows with linked records, correlated events and run history.
- Existing role checks, opt-out handling, frozen approval history, send reservations and reply-stopping rules.
- API/provider adapters and configuration screens, with unfinished capabilities explicitly marked.
- Loading deadline and response validation; network failure is shown instead of indefinite loading.
- Sakha positioning, supplied brochure, and internal build knowledge outside the Products UI.

The actual Sakha voice/calling/patient dashboard product is not part of this CMO source. Third-party credentials, online user accounts and production database exports are not included.
