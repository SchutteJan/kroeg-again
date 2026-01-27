# Amsterdam Isometric Pixel Art Map — Implementation Plan

This plan implements [SPEC.md](./SPEC.md). Task order does not imply sequence; dependencies are
noted inline.

- [x] Update `package.json` metadata and scripts (`build`, `dev`, `lint`, `format`, `typecheck`, `test`). (Ref: [SPEC.md — Dependencies](./SPEC.md#dependencies))
- [x] Add dev dependencies for TypeScript, linting, formatting, and testing. (Ref: [SPEC.md — Dependencies](./SPEC.md#dependencies))
- [x] Create `tsconfig.json` with NodeNext + strict settings. (Ref: [SPEC.md — Directory Structure](./SPEC.md#directory-structure))
- [x] Create `eslint.config.js` and `.prettierrc` with the required rules. (Ref: [SPEC.md — Dependencies](./SPEC.md#dependencies))
- [x] Create `vitest.config.ts` and `src/__tests__/config.test.ts` to verify config loading. (Ref: [SPEC.md — Testing](./SPEC.md#testing))
- [x] Create project directory structure (`src/`, `src/__tests__/`, `src/dashboard/`, `dashboard/`, `data/`, `renders/`, `tiles/`, `output/`, `output/viewer/`). (Ref: [SPEC.md — Directory Structure](./SPEC.md#directory-structure))
- [x] Add `.gitignore` for build artifacts and generated assets. (Ref: [SPEC.md — Directory Structure](./SPEC.md#directory-structure))
- [x] Add `.env.example` documenting required env vars. (Ref: [SPEC.md — External Services](./SPEC.md#external-services))
- [x] Add `config.json` with default Amsterdam bounds and pipeline settings. (Ref: [SPEC.md — Configuration](./SPEC.md#configuration))
- [x] Create `src/types.ts` with shared interfaces from the spec. (Ref: [SPEC.md — Tile System](./SPEC.md#tile-system))
- [x] Create `src/config.ts` to load and validate configuration with env overrides. (Ref: [SPEC.md — Configuration](./SPEC.md#configuration))
- [x] Create `src/index.ts` CLI placeholder entry point. (Ref: [SPEC.md — CLI Commands](./SPEC.md#cli-commands))

- [x] Add production dependencies for database, rendering, and APIs. (Ref: [SPEC.md — Dependencies](./SPEC.md#dependencies)) (Depends on: none)
- [x] Create CLI entry point with Commander.js and subcommands (`init`, `render`, `generate`, `assemble`, `serve`, `status`, `dashboard`). (Ref: [SPEC.md — CLI Commands](./SPEC.md#cli-commands)) (Depends on: Commander dependency)
- [x] Add `bin` field to `package.json` for CLI usage. (Ref: [SPEC.md — CLI Commands](./SPEC.md#cli-commands)) (Depends on: CLI entry point)

- [x] Create `src/db.ts` for SQLite initialization and schema creation. (Ref: [SPEC.md — Database Schema](./SPEC.md#database-schema)) (Depends on: `better-sqlite3` dependency)
- [x] Add database migration support with schema versioning. (Ref: [SPEC.md — Database Schema](./SPEC.md#database-schema)) (Depends on: `src/db.ts`)
- [x] Implement tile CRUD functions in `src/db.ts`. (Ref: [SPEC.md — Tile System](./SPEC.md#tile-system)) (Depends on: `src/db.ts`)
- [x] Implement quadrant CRUD functions in `src/db.ts`. (Ref: [SPEC.md — Tile System](./SPEC.md#tile-system)) (Depends on: `src/db.ts`)
- [x] Write tests for database initialization, migrations, and CRUD. (Ref: [SPEC.md — Testing](./SPEC.md#testing)) (Depends on: `src/db.ts`)

- [x] Create `src/grid.ts` with slippy tile math helpers. (Ref: [SPEC.md — Stage 1](./SPEC.md#stage-1-grid-generation)) (Depends on: `src/types.ts`)
- [x] Implement `generateGrid` and `generateQuadrants`. (Ref: [SPEC.md — Stage 1](./SPEC.md#stage-1-grid-generation)) (Depends on: `src/grid.ts`)
- [x] Write tests for grid generation and quadrant grouping. (Ref: [SPEC.md — Testing](./SPEC.md#testing)) (Depends on: `src/grid.ts`)

- [x] Implement `pnpm run init` command in `src/commands/init.ts`. (Ref: [SPEC.md — CLI Commands](./SPEC.md#cli-commands)) (Depends on: `src/db.ts`, `src/grid.ts`)
- [x] Add `--force` and `--bounds` flags to init command. (Ref: [SPEC.md — CLI Commands](./SPEC.md#cli-commands)) (Depends on: init command)
- [x] Write integration tests for init command. (Ref: [SPEC.md — Testing](./SPEC.md#testing)) (Depends on: init command)

- [x] Create `src/dashboard/server.ts`, `src/dashboard/routes.ts`, and `src/dashboard/events.ts`. (Ref: [SPEC.md — Stage 7](./SPEC.md#stage-7-generation-dashboard)) (Depends on: `express` dependency)
- [x] Implement dashboard API endpoints (`/api/tiles`, `/api/tiles/:id`, `/api/progress`, `/api/events`). (Ref: [SPEC.md — Dashboard API Endpoints](./SPEC.md#dashboard-api-endpoints)) (Depends on: dashboard server)
- [x] Implement SSE polling for tile updates. (Ref: [SPEC.md — Update Mechanism](./SPEC.md#update-mechanism)) (Depends on: dashboard server, database)
- [x] Write tests for SSE and API endpoints. (Ref: [SPEC.md — Testing](./SPEC.md#testing)) (Depends on: dashboard server)

- [x] Create dashboard static files (`dashboard/index.html`, `dashboard/style.css`, `dashboard/app.js`). (Ref: [SPEC.md — Dashboard Layout](./SPEC.md#dashboard-layout)) (Depends on: none)
- [x] Implement grid rendering, SSE updates, filters, zoom/pan, and tile detail UI. (Ref: [SPEC.md — Interactive Features](./SPEC.md#interactive-features)) (Depends on: dashboard static files)
- [x] Implement `pnpm run dashboard` command with `open` integration. (Ref: [SPEC.md — CLI Integration](./SPEC.md#cli-integration)) (Depends on: dashboard server)

- [x] Implement `pnpm run status` command with progress stats. (Ref: [SPEC.md — Status](./SPEC.md#status)) (Depends on: database)

- [x] Create `src/render.ts` with placeholder renderer and isometric config settings. (Ref: [SPEC.md — Stage 2](./SPEC.md#stage-2-geometry-rendering)) (Depends on: `three` dependency)
- [ ] Integrate Google Maps 3D Tiles API fetching and rate limiting. (Ref: [SPEC.md — Google Maps 3D Tiles](./SPEC.md#google-maps-3d-tiles)) (Depends on: render setup)
- [x] Implement `renderTile` and render validation. (Ref: [SPEC.md — Stage 2](./SPEC.md#stage-2-geometry-rendering)) (Depends on: render setup)
- [x] Implement `pnpm run render` command with flags. (Ref: [SPEC.md — Render Geometry](./SPEC.md#render-geometry)) (Depends on: render pipeline)
- [x] Write unit/integration tests for render pipeline. (Ref: [SPEC.md — Testing](./SPEC.md#testing)) (Depends on: render pipeline)

- [x] Create `src/gcs.ts` for Google Cloud Storage uploads. (Ref: [SPEC.md — Google Cloud Storage](./SPEC.md#google-cloud-storage)) (Depends on: `@google-cloud/storage` dependency)
- [x] Create `src/oxen.ts` for Oxen.ai API integration with backoff. (Ref: [SPEC.md — Oxen.ai Image Generation](./SPEC.md#oxenai-image-generation)) (Depends on: HTTP client)
- [x] Implement download helper for generated images. (Ref: [SPEC.md — Stage 3](./SPEC.md#stage-3-pixel-art-generation)) (Depends on: `src/oxen.ts`)
- [x] Write unit tests for GCS and Oxen clients. (Ref: [SPEC.md — Testing](./SPEC.md#testing)) (Depends on: GCS/Oxen modules)

- [x] Create `src/infill.ts` to generate infill images and masks. (Ref: [SPEC.md — Stage 4](./SPEC.md#stage-4-infill-generation)) (Depends on: `sharp` dependency, database)
- [x] Implement neighbor detection and template validation. (Ref: [SPEC.md — Infill Template Shapes](./SPEC.md#infill-template-shapes)) (Depends on: `src/infill.ts`)
- [x] Write tests for infill mask generation and template rules. (Ref: [SPEC.md — Testing](./SPEC.md#testing)) (Depends on: `src/infill.ts`)

- [x] Create `src/generate.ts` orchestration with logging. (Ref: [SPEC.md — Stage 3](./SPEC.md#stage-3-pixel-art-generation)) (Depends on: `src/gcs.ts`, `src/oxen.ts`, `src/infill.ts`)
- [x] Implement single-tile mode and retry handling. (Ref: [SPEC.md — Generate Pixel Art](./SPEC.md#generate-pixel-art)) (Depends on: `src/generate.ts`)
- [x] Implement generation strategy selection (`spiral`, `random`, `row-by-row`). (Ref: [SPEC.md — Generation Order](./SPEC.md#generation-order)) (Depends on: database, quadrants)
- [x] Implement `pnpm run generate` command with flags. (Ref: [SPEC.md — Generate Pixel Art](./SPEC.md#generate-pixel-art)) (Depends on: `src/generate.ts`)
- [x] Write tests for generation orchestration and strategies. (Ref: [SPEC.md — Testing](./SPEC.md#testing)) (Depends on: `src/generate.ts`)

- [x] Create `src/assemble.ts` for DZI assembly and XML descriptor. (Ref: [SPEC.md — Stage 5](./SPEC.md#stage-5-assembly)) (Depends on: `sharp` dependency)
- [x] Implement zoom pyramid output and tile layout. (Ref: [SPEC.md — Assembly Process](./SPEC.md#assembly-process)) (Depends on: `src/assemble.ts`)
- [x] Implement `pnpm run assemble` command with flags. (Ref: [SPEC.md — Assemble Viewer](./SPEC.md#assemble-viewer)) (Depends on: `src/assemble.ts`)
- [x] Write tests for DZI assembly. (Ref: [SPEC.md — Testing](./SPEC.md#testing)) (Depends on: `src/assemble.ts`)

- [x] Create viewer files in `output/viewer/` using OpenSeaDragon. (Ref: [SPEC.md — Stage 6](./SPEC.md#stage-6-web-viewer)) (Depends on: DZI output)
- [x] Implement `pnpm run serve` command for static viewer hosting. (Ref: [SPEC.md — Serve Viewer](./SPEC.md#serve-viewer)) (Depends on: viewer output)

- [x] Implement dashboard generation controls (`/api/generate/start`, `/api/generate/pause`, `/api/generate/retry/:id`). (Ref: [SPEC.md — Dashboard Controls](./SPEC.md#dashboard-controls)) (Depends on: dashboard server, generation command)
- [x] Implement dashboard UI controls for start/pause/retry and settings. (Ref: [SPEC.md — Dashboard Controls](./SPEC.md#dashboard-controls)) (Depends on: dashboard UI)

- [ ] Add structured logging and graceful shutdown handling. (Ref: [SPEC.md — Error Handling](./SPEC.md#error-handling)) (Depends on: CLI commands)
- [ ] Implement backup/restore command for database. (Ref: [SPEC.md — Error Handling](./SPEC.md#error-handling)) (Depends on: database)
- [ ] Update README and usage docs. (Ref: [SPEC.md — Documentation](./SPEC.md#documentation)) (Depends on: core pipeline)
- [ ] Profile and optimize performance hot spots. (Ref: [SPEC.md — Performance](./SPEC.md#performance)) (Depends on: pipeline)
