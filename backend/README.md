# Backend

`api` contains the workspace, team, Gmail, operations and automation HTTP handlers. `services` contains persistence, permissions, provider execution and workflow policies. `db` and `drizzle` contain the schema and all migrations. `auth` adapts verified hosting identity.

Run `pnpm run setup` from the project root to initialize the local D1 emulator. Start both backend and frontend with `pnpm dev`; no independent Express server is required. Generated local records live in `../.local/state`.

Copying this code does not copy online records or provider credentials. Sample data works without credentials. Read the root README and `../docs/LOCAL-AND-DEPLOYMENT.md` for production identity requirements.
