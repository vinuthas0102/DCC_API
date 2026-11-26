# Project memory

## Product intent & audience

- Enterprise web app for **Demand and Collection Center (DCC) rule setup and management**
- Audience: internal operators/administrators managing DCC rules at high density
- Core features: CRUD rule management, search, collection exception grids, dropdown/lookup configuration

## Brand personality & voice

- Enterprise, utility-focused; prioritizes density and clarity over marketing polish
- Trustworthy and precise — API/server responses treated as authoritative

## Visual design & UX direction

- **Stack**: Vite + React, Tailwind CSS, Lucide React icons, `@/` path alias (`src/`)
- High-density data-grid UI; summary table is the primary view
- Table auto-refreshes after every create/update/delete to stay in sync with disk
- No external UI/icon packages beyond Lucide React
- Refer to `.bolt/prompt` for global design-quality and import conventions

## Decisions, constraints & rationale

- **Single source of truth**: all rule data persists to `public/data/dcc-rules.json` (pretty-printed, timestamped). Removed intermediate sidecar (`.dcc-state.json`) to prevent hidden/lost changes.
- **Lookup data served live**: `public/data/dcc-lookups.json` exposed via a dev-server route so dropdown edits appear on refresh without rebuild.
- **API base is env-driven**: all requests target `{VITE_API_BASE_URL}/dcc/rules`; switching between `/api` and an ngrok URL requires no code changes.
- **Server is authoritative**: duplicate (409) and not-found (404) responses come from the server; browser-storage fallback only when no server responds (e.g., static preview).
- **Status codes in use**: 201 create, 409 duplicate, 404 not found.

## Open questions & assumptions

- Production deployment strategy (static hosting vs. persistent backend) not yet defined — current persistence relies on dev-server file writes.
- Exact schema/fields for DCC rules and lookups not documented here; inferred from JSON files in `public/data/`.
- Collection exception grid scope and behavior not fully specified beyond being a named feature.