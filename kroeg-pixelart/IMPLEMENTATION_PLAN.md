# Amsterdam Isometric Pixel Art Map — Implementation Plan

This plan implements the [SPEC.md](./SPEC.md). Tasks are grouped into phases for clarity, but
dependencies are noted explicitly. Tasks within a phase can often be parallelized.

---

## Phase 1: Project Setup & Tooling

Foundation: TypeScript, linting, testing, and project structure.

### 1.1 Package Configuration

- [ ] **1.1.1** Update `package.json` with project metadata, scripts, and pnpm configuration
  - Scripts: `build`, `dev`, `test`, `lint`, `typecheck`
  - Set `"type": "module"` for ESM
  - Ref: [SPEC.md — Dependencies](./SPEC.md#dependencies)

- [ ] **1.1.2** Install production dependencies
  - `@google-cloud/storage`, `better-sqlite3`, `commander`, `express`, `open`, `sharp`, `three`

- [ ] **1.1.3** Install dev dependencies
  - `typescript`, `tsx`, `vitest`, `eslint`, `@typescript-eslint/parser`,
    `@typescript-eslint/eslint-plugin`, `prettier`
  - Type definitions: `@types/better-sqlite3`, `@types/express`, `@types/node`, `@types/three`

### 1.2 TypeScript Configuration

- [ ] **1.2.1** Create `tsconfig.json`
  - Target: `ES2022`, module: `NodeNext`, strict mode enabled
  - Include `src/**/*`, exclude `node_modules`
  - Enable `resolveJsonModule` for config.json imports

- [ ] **1.2.2** Create `src/types.ts` with all shared interfaces
  - `GeoBounds`, `TileCoord`, `Tile`, `TileStatus`, `Quadrant`, `QuadrantStatus`
  - `RenderConfig`, `OxenGenerationRequest`, `GenerationRequest`, `GenerationResult`
  - `ProgressStats`, `ErrorInfo`, `TileUpdate`
  - Ref: [SPEC.md — Tile System](./SPEC.md#tile-system), [SPEC.md — Stage 3](./SPEC.md#stage-3-pixel-art-generation)

### 1.3 Linting & Formatting

- [ ] **1.3.1** Create `eslint.config.js` (flat config)
  - Extend `@typescript-eslint/recommended`
  - Rules: no-unused-vars (error), no-explicit-any (warn), consistent-return

- [ ] **1.3.2** Create `.prettierrc`
  - Print width: 100, single quotes, trailing commas, 2-space indent

- [ ] **1.3.3** Add `lint` and `format` scripts to package.json
  - `lint`: `eslint src --ext .ts`
  - `format`: `prettier --write src`

### 1.4 Testing Framework

- [ ] **1.4.1** Create `vitest.config.ts`
  - Environment: `node`
  - Include: `src/**/*.test.ts`
  - Coverage: enabled with thresholds (statements: 60%)

- [ ] **1.4.2** Create test directory structure
  - `src/__tests__/` for unit tests
  - Test files named `*.test.ts`

- [ ] **1.4.3** Add example test `src/__tests__/types.test.ts`
  - Verify type exports compile correctly
  - Test helper functions (if any)

- [ ] **1.4.4** Add `test` script to package.json
  - `vitest run` for CI, `vitest` for watch mode

### 1.5 Project Structure

- [ ] **1.5.1** Create directory structure
  ```
  src/
  src/__tests__/
  src/dashboard/
  dashboard/
  data/
  renders/
  tiles/
  output/
  output/viewer/
  ```

- [ ] **1.5.2** Create `.gitignore`
  - Ignore: `node_modules/`, `data/*.db`, `renders/`, `tiles/`, `output/`, `.env`, `dist/`

- [ ] **1.5.3** Create `.env.example`
  - Document required env vars: `OXEN_API_KEY`, `GOOGLE_MAPS_API_KEY`, `GCS_BUCKET`

- [ ] **1.5.4** Create `config.json` with default Amsterdam bounds
  - Ref: [SPEC.md — Configuration](./SPEC.md#configuration)

### 1.6 CLI Entry Point

- [ ] **1.6.1** Create `src/index.ts` with Commander.js setup
  - Subcommands: `init`, `render`, `generate`, `assemble`, `serve`, `status`, `dashboard`
  - Each command imports from dedicated module
  - Ref: [SPEC.md — CLI Commands](./SPEC.md#cli-commands)

- [ ] **1.6.2** Create `src/config.ts`
  - Load and validate `config.json`
  - Merge with environment variables
  - Export typed config object

- [ ] **1.6.3** Add `bin` field to package.json
  - Entry: `./dist/index.js` or use `tsx` for development

---

## Phase 2: Database & Grid System

SQLite schema, tile grid generation, and core data layer.

### 2.1 Database Setup

- [ ] **2.1.1** Create `src/db.ts` with SQLite initialization
  - Use `better-sqlite3` for synchronous queries
  - Create database file at `data/amsterdam.db`
  - Ref: [SPEC.md — Database Schema](./SPEC.md#database-schema)

- [ ] **2.1.2** Implement schema creation in `db.ts`
  - `tiles` table with all columns from spec
  - `quadrants` table with foreign keys to tiles
  - `generation_log` table for audit trail
  - Create indexes for `status` and `coords`

- [ ] **2.1.3** Add database migration support
  - Version table to track schema version
  - `migrate()` function to apply pending migrations

- [ ] **2.1.4** Write tests for database initialization
  - Test: schema creates all tables
  - Test: indexes exist
  - Test: migrations are idempotent

### 2.2 Tile CRUD Operations

- [ ] **2.2.1** Implement `createTile(tile: Tile): void` in `db.ts`
  - Insert tile record with pending status

- [ ] **2.2.2** Implement `getTile(id: string): Tile | null`
  - Fetch single tile by ID

- [ ] **2.2.3** Implement `getTilesByStatus(status: TileStatus): Tile[]`
  - Fetch all tiles with given status

- [ ] **2.2.4** Implement `updateTileStatus(id: string, status: TileStatus, error?: string): void`
  - Update status and updated_at timestamp
  - Optionally set error_message

- [ ] **2.2.5** Implement `getAllTiles(): Tile[]`
  - Fetch all tiles for dashboard

- [ ] **2.2.6** Write tests for tile CRUD
  - Test: create, read, update cycle
  - Test: filter by status
  - Test: error message storage

### 2.3 Quadrant CRUD Operations

- [ ] **2.3.1** Implement `createQuadrant(quadrant: Quadrant): void`
  - Insert quadrant with references to 4 tiles

- [ ] **2.3.2** Implement `getQuadrant(id: string): Quadrant | null`
  - Fetch quadrant with tile references

- [ ] **2.3.3** Implement `getQuadrantsByStatus(status: QuadrantStatus): Quadrant[]`
  - Fetch quadrants by status

- [ ] **2.3.4** Implement `updateQuadrantStatus(id: string, status: QuadrantStatus): void`
  - Update quadrant status

- [ ] **2.3.5** Write tests for quadrant CRUD
  - Test: create with tile references
  - Test: status updates

### 2.4 Grid Generation

- [ ] **2.4.1** Create `src/grid.ts` with slippy tile math
  - `latLonToTile(lat, lon, zoom): TileCoord` — convert geo coords to tile coords
  - `tileToLatLonBounds(x, y, zoom): GeoBounds` — convert tile coords to geo bounds
  - Ref: [SPEC.md — Stage 1](./SPEC.md#stage-1-grid-generation)

- [ ] **2.4.2** Implement `generateGrid(bounds: GeoBounds, zoomLevel: number): Tile[]`
  - Calculate min/max tile coords from bounds
  - Create Tile objects for each grid cell
  - Assign geographic bounds to each tile

- [ ] **2.4.3** Implement `generateQuadrants(tiles: Tile[]): Quadrant[]`
  - Group tiles into 2×2 quadrants
  - Handle edge cases (odd grid dimensions)

- [ ] **2.4.4** Write tests for grid generation
  - Test: known Amsterdam bounds produce expected tile count
  - Test: tile bounds are contiguous (no gaps)
  - Test: quadrant grouping is correct

### 2.5 Init Command

- [ ] **2.5.1** Implement `pnpm run init` command in `src/commands/init.ts`
  - Create database if not exists
  - Run migrations
  - Generate grid from config bounds
  - Insert tiles and quadrants into database
  - Create directory structure

- [ ] **2.5.2** Add `--force` flag to reinitialize
  - Drop and recreate database
  - Warn user about data loss

- [ ] **2.5.3** Add `--bounds` flag to override config
  - Parse `north,south,east,west` format

- [ ] **2.5.4** Write integration test for init command
  - Test: fresh init creates database with tiles
  - Test: reinit with --force works

---

## Phase 3: Dashboard & Grid Visualization

Live monitoring dashboard with tile grid view.

### 3.1 Express Server Setup

- [ ] **3.1.1** Create `src/dashboard/server.ts`
  - Express app with static file serving
  - Serve `dashboard/` directory
  - Listen on port 3001 (configurable)

- [ ] **3.1.2** Create `src/dashboard/routes.ts`
  - Mount API routes under `/api`
  - Import route handlers

- [ ] **3.1.3** Implement `GET /api/tiles` endpoint
  - Return all tiles as JSON array
  - Include status, coords, bounds

- [ ] **3.1.4** Implement `GET /api/tiles/:id` endpoint
  - Return single tile details
  - Include render_path, output_path if available

- [ ] **3.1.5** Implement `GET /api/progress` endpoint
  - Return `ProgressStats` object
  - Calculate counts by status
  - Calculate rate and ETA (if generation in progress)

### 3.2 Server-Sent Events

- [ ] **3.2.1** Create `src/dashboard/events.ts`
  - SSE connection manager
  - Track connected clients

- [ ] **3.2.2** Implement `GET /api/events` SSE endpoint
  - Set correct headers for SSE
  - Keep connection alive with heartbeat

- [ ] **3.2.3** Implement SQLite polling for changes
  - Poll every 1 second
  - Track last known state
  - Emit deltas when tiles change status
  - Ref: [SPEC.md — Update Mechanism](./SPEC.md#update-mechanism)

- [ ] **3.2.4** Write tests for SSE
  - Test: client receives updates when tile status changes
  - Test: multiple clients receive same updates

### 3.3 Dashboard Frontend — HTML/CSS

- [ ] **3.3.1** Create `dashboard/index.html`
  - Basic HTML structure with grid container
  - Progress panel placeholder
  - Error log placeholder
  - Control buttons (Start/Pause)

- [ ] **3.3.2** Create `dashboard/style.css`
  - Grid layout for tile visualization
  - Status color classes (pending, rendered, generating, complete, failed)
  - Responsive design for large grids
  - Ref: [SPEC.md — Tile Status Colors](./SPEC.md#tile-status-colors)

- [ ] **3.3.3** Style progress panel
  - Stat rows with labels and values
  - Progress bar visualization

- [ ] **3.3.4** Style error log panel
  - Scrollable list
  - Timestamp and message format

### 3.4 Dashboard Frontend — JavaScript

- [ ] **3.4.1** Create `dashboard/app.js`
  - Fetch initial tile data from `/api/tiles`
  - Render grid on page load

- [ ] **3.4.2** Implement tile grid rendering
  - Create DOM elements for each tile
  - Position based on x,y coords
  - Apply status color classes
  - Handle large grids (virtualization or canvas)

- [ ] **3.4.3** Implement SSE connection
  - Connect to `/api/events`
  - Parse incoming events
  - Update tile status in DOM
  - Update progress stats

- [ ] **3.4.4** Implement tile click handler
  - Show tile details in modal/panel
  - Display coordinates, bounds, timestamps
  - Show preview image if available

- [ ] **3.4.5** Implement zoom/pan for grid
  - Mouse wheel zoom
  - Click-drag pan
  - Zoom to fit button

- [ ] **3.4.6** Implement status filter
  - Dropdown or checkboxes to filter displayed tiles
  - Highlight tiles matching filter

### 3.5 Dashboard CLI Command

- [ ] **3.5.1** Implement `pnpm run dashboard` command in `src/commands/dashboard.ts`
  - Start Express server
  - Open browser automatically using `open` package
  - Log server URL to console

- [ ] **3.5.2** Add `--port` flag
  - Override default port 3001

- [ ] **3.5.3** Add `--no-open` flag
  - Skip browser auto-open

### 3.6 Status Command

- [ ] **3.6.1** Implement `pnpm run status` command in `src/commands/status.ts`
  - Query database for tile counts by status
  - Display formatted table in terminal
  - Show percentage complete

- [ ] **3.6.2** Add progress bar to status output
  - ASCII progress bar
  - Show ETA if generation in progress

---

## Phase 4: Geometry Rendering Pipeline

Google Maps 3D Tiles → Three.js → PNG renders.

### 4.1 Three.js Setup

- [ ] **4.1.1** Create `src/render.ts` with Three.js scene setup
  - Create scene, camera, renderer
  - Configure orthographic camera for isometric view
  - Ref: [SPEC.md — Three.js Setup](./SPEC.md#threejs-setup)

- [ ] **4.1.2** Implement isometric camera configuration
  - 30° rotation angle
  - Orthographic projection (no perspective)
  - Camera faces north
  - Ref: [SPEC.md — Isometric Camera](./SPEC.md#isometric-camera)

- [ ] **4.1.3** Implement headless rendering setup
  - Use headless Chromium or node-canvas fallback
  - Configure WebGL context for server-side rendering
  - Ref: [SPEC.md — Google Maps 3D Tiles](./SPEC.md#google-maps-3d-tiles)

- [ ] **4.1.4** Write test for camera math
  - Test: camera produces correct isometric projection
  - Test: output dimensions are 512×512

### 4.2 Google Maps 3D Tiles Integration

- [ ] **4.2.1** Research Google Maps 3D Tiles API
  - Document authentication requirements
  - Identify tile fetching endpoints
  - Understand tile format (glTF/3D Tiles)

- [ ] **4.2.2** Implement tile fetching in `src/render.ts`
  - `fetchGoogleTile(bounds: GeoBounds): Promise<Object3D>`
  - Authenticate with `GOOGLE_MAPS_API_KEY`
  - Load 3D tile data for given bounds

- [ ] **4.2.3** Implement 3D tile loading into Three.js
  - Parse tile format
  - Add geometry and textures to scene
  - Position based on geographic bounds

- [ ] **4.2.4** Implement rate limiting and backoff
  - Track API calls
  - Implement exponential backoff on rate limit errors

- [ ] **4.2.5** Write integration test with mock tiles
  - Test: tile loads and renders
  - Test: rate limiting works

### 4.3 Render Output

- [ ] **4.3.1** Implement `renderTile(tile: Tile): Promise<string>` function
  - Setup scene with tile geometry
  - Render to PNG buffer
  - Save to `renders/tile_{x}_{y}.png`
  - Return output path

- [ ] **4.3.2** Update tile status after render
  - Set status to "rendered"
  - Store render_path in database

- [ ] **4.3.3** Implement render validation
  - Check output image dimensions (512×512)
  - Check file size (not empty)
  - Log warnings for potential issues

- [ ] **4.3.4** Write tests for render output
  - Test: PNG file created at correct path
  - Test: database updated with render_path

### 4.4 Render Command

- [ ] **4.4.1** Implement `pnpm run render` command in `src/commands/render.ts`
  - Query pending tiles from database
  - Render each tile sequentially
  - Update progress in console

- [ ] **4.4.2** Add `--tile=x,y` flag
  - Render single specific tile
  - Useful for testing

- [ ] **4.4.3** Add `--all` flag
  - Render all pending tiles
  - Show progress bar

- [ ] **4.4.4** Add `--limit=N` flag
  - Render at most N tiles
  - Useful for batch processing

- [ ] **4.4.5** Add `--parallel=N` flag
  - Render N tiles in parallel
  - Default: 1 (sequential)

- [ ] **4.4.6** Write integration test for render command
  - Test: renders specified tile
  - Test: updates database status

---

## Phase 5: AI Style Transfer Pipeline

Oxen.ai integration for pixel art generation.

### 5.1 Google Cloud Storage

- [ ] **5.1.1** Create `src/gcs.ts` with GCS client setup
  - Initialize Storage client
  - Use `GOOGLE_APPLICATION_CREDENTIALS` or ADC

- [ ] **5.1.2** Implement `uploadImage(localPath: string, remoteName: string): Promise<string>`
  - Upload PNG to configured bucket
  - Return public URL
  - Ref: [SPEC.md — Google Cloud Storage](./SPEC.md#google-cloud-storage)

- [ ] **5.1.3** Implement `deleteImage(remoteName: string): Promise<void>`
  - Clean up uploaded images after generation

- [ ] **5.1.4** Write tests for GCS operations
  - Test: upload returns valid URL
  - Test: delete removes file
  - Mock GCS client for unit tests

### 5.2 Oxen.ai Client

- [ ] **5.2.1** Create `src/oxen.ts` with Oxen.ai API client
  - HTTP client with authorization header
  - Use `OXEN_API_KEY` from environment

- [ ] **5.2.2** Implement `generateImage(request: OxenGenerationRequest): Promise<string>`
  - POST to `https://hub.oxen.ai/api/images/edit`
  - Return generated image URL
  - Ref: [SPEC.md — API Request](./SPEC.md#api-request)

- [ ] **5.2.3** Implement `downloadImage(url: string, localPath: string): Promise<void>`
  - Download generated image from Oxen.ai
  - Save to local filesystem

- [ ] **5.2.4** Implement rate limiting and backoff
  - Track API calls
  - Exponential backoff on errors

- [ ] **5.2.5** Write tests for Oxen.ai client
  - Mock API responses
  - Test: successful generation flow
  - Test: error handling

### 5.3 Infill Image Generation

- [ ] **5.3.1** Create `src/infill.ts` with infill logic
  - Composite render + neighboring tiles
  - Create masked input image

- [ ] **5.3.2** Implement `createInfillImage(tile: Tile, neighbors: Tile[]): Promise<Buffer>`
  - Load render PNG
  - Load completed neighbor tiles
  - Composite into 1024×1024 image
  - Apply mask for generation region
  - Ref: [SPEC.md — Infill Rules](./SPEC.md#infill-rules)

- [ ] **5.3.3** Implement neighbor detection
  - `getCompletedNeighbors(tile: Tile): Tile[]`
  - Query adjacent tiles from database
  - Return only completed tiles

- [ ] **5.3.4** Implement quadrant template validation
  - Check neighbor constraints (1×1, 1×2, 2×1, 2×2 rules)
  - Reject invalid configurations
  - Ref: [SPEC.md — Infill Template Shapes](./SPEC.md#infill-template-shapes)

- [ ] **5.3.5** Write tests for infill generation
  - Test: infill image has correct dimensions
  - Test: mask is applied correctly
  - Test: template validation rules

### 5.4 Generation Orchestration

- [ ] **5.4.1** Create `src/generate.ts` with generation orchestration
  - Coordinate GCS upload, Oxen.ai call, download

- [ ] **5.4.2** Implement `generateTile(tile: Tile): Promise<void>`
  - Create infill image
  - Upload to GCS
  - Call Oxen.ai
  - Download result
  - Save to `tiles/tile_{x}_{y}.png`
  - Update database status

- [ ] **5.4.3** Implement single-tile mode (no infill)
  - Skip infill for `--tile` flag
  - Generate tile in isolation
  - Useful for testing pipeline
  - Ref: [SPEC.md — Single tile mode](./SPEC.md#generate-pixel-art)

- [ ] **5.4.4** Implement generation logging
  - Insert record into `generation_log` table
  - Track model, prompt, timestamps, success/failure

- [ ] **5.4.5** Write tests for generation orchestration
  - Mock GCS and Oxen.ai
  - Test: full flow completes
  - Test: database updated correctly

### 5.5 Generation Strategy

- [ ] **5.5.1** Implement `getNextQuadrant(strategy: GenerationStrategy): Quadrant | null`
  - Query pending quadrants
  - Apply strategy (spiral, random, row-by-row)
  - Return next quadrant to generate
  - Ref: [SPEC.md — Generation Order](./SPEC.md#generation-order)

- [ ] **5.5.2** Implement spiral strategy
  - Start from center of grid
  - Expand outward in spiral pattern
  - Prefer quadrants with most completed neighbors

- [ ] **5.5.3** Implement random strategy
  - Random selection from valid quadrants

- [ ] **5.5.4** Implement row-by-row strategy
  - Process top-to-bottom, left-to-right

- [ ] **5.5.5** Write tests for generation strategies
  - Test: spiral starts at center
  - Test: strategies respect neighbor constraints

### 5.6 Generate Command

- [ ] **5.6.1** Implement `pnpm run generate` command in `src/commands/generate.ts`
  - Main generation loop
  - Select next quadrant
  - Generate all tiles in quadrant
  - Update progress

- [ ] **5.6.2** Add `--tile=x,y` flag
  - Generate single tile in isolation
  - Skip infill/masking

- [ ] **5.6.3** Add `--quadrant=qx,qy` flag
  - Generate specific quadrant

- [ ] **5.6.4** Add `--continue` flag
  - Resume from last position
  - Skip already completed

- [ ] **5.6.5** Add `--limit=N` flag
  - Generate at most N quadrants

- [ ] **5.6.6** Add `--strategy` flag
  - Select generation strategy (spiral, random, row-by-row)

- [ ] **5.6.7** Add `--retry-failed` flag
  - Retry all failed tiles
  - Reset status to pending first
  - Ref: [SPEC.md — Retry Strategy](./SPEC.md#retry-strategy)

- [ ] **5.6.8** Implement error handling
  - Stop on first failure (default)
  - Mark tile as failed with error message
  - Log to generation_log

- [ ] **5.6.9** Write integration tests for generate command
  - Test: single tile generation works
  - Test: quadrant generation works
  - Test: --continue resumes correctly

---

## Phase 6: Assembly & Viewer

DZI generation and OpenSeaDragon viewer.

### 6.1 DZI Assembly

- [ ] **6.1.1** Create `src/assemble.ts` with DZI generation
  - Load completed tiles from database
  - Generate zoom pyramid
  - Ref: [SPEC.md — Assembly Process](./SPEC.md#assembly-process)

- [ ] **6.1.2** Implement zoom level generation
  - Level 0: single tile (most zoomed out)
  - Each level doubles resolution
  - Top level: original 512×512 tiles
  - Use `sharp` for image resizing

- [ ] **6.1.3** Implement DZI XML descriptor generation
  - `amsterdam.dzi` file with format metadata
  - Tile size, overlap, format settings

- [ ] **6.1.4** Implement tile output structure
  - `amsterdam_files/{level}/{x}_{y}.jpg`
  - JPEG compression for smaller file size

- [ ] **6.1.5** Write tests for DZI assembly
  - Test: correct number of zoom levels
  - Test: DZI XML is valid
  - Test: tiles at each level have correct dimensions

### 6.2 Assemble Command

- [ ] **6.2.1** Implement `pnpm run assemble` command in `src/commands/assemble.ts`
  - Validate all tiles are complete
  - Generate DZI pyramid
  - Show progress

- [ ] **6.2.2** Add `--partial` flag
  - Allow assembly with incomplete tiles
  - Fill missing tiles with placeholder

- [ ] **6.2.3** Add `--output` flag
  - Override output directory

### 6.3 Web Viewer

- [ ] **6.3.1** Create `output/viewer/index.html`
  - Include OpenSeaDragon from CDN
  - Map container div
  - Basic styling

- [ ] **6.3.2** Create `output/viewer/style.css`
  - Full-screen map container
  - Navigator positioning

- [ ] **6.3.3** Create `output/viewer/app.js`
  - Initialize OpenSeaDragon viewer
  - Load `amsterdam.dzi` tile source
  - Configure zoom levels and navigator
  - Ref: [SPEC.md — OpenSeaDragon Configuration](./SPEC.md#openseadragon-configuration)

- [ ] **6.3.4** Add viewer metadata overlay
  - Show current zoom level
  - Show approximate location (if implemented)

### 6.4 Serve Command

- [ ] **6.4.1** Implement `pnpm run serve` command in `src/commands/serve.ts`
  - Static file server for `output/` directory
  - Serve viewer and DZI tiles
  - Default port 3000

- [ ] **6.4.2** Add `--port` flag
  - Override default port

- [ ] **6.4.3** Open browser automatically
  - Use `open` package
  - Navigate to viewer URL

---

## Phase 7: Dashboard Controls

Generation control from dashboard.

### 7.1 Generation Control API

- [ ] **7.1.1** Implement `POST /api/generate/start` endpoint
  - Spawn generation subprocess
  - Store PID for management

- [ ] **7.1.2** Implement `POST /api/generate/pause` endpoint
  - Send SIGTERM to generation process
  - Update dashboard state

- [ ] **7.1.3** Implement `POST /api/generate/retry/:id` endpoint
  - Reset tile status to pending
  - Trigger regeneration

- [ ] **7.1.4** Implement generation state tracking
  - Track if generation is running
  - Track current tile being generated
  - Expose via `/api/progress`

### 7.2 Dashboard Control UI

- [ ] **7.2.1** Implement Start button
  - Call `/api/generate/start`
  - Update button state to "Running"

- [ ] **7.2.2** Implement Pause button
  - Call `/api/generate/pause`
  - Update button state to "Paused"

- [ ] **7.2.3** Implement retry on tile click
  - Show retry button for failed tiles
  - Call `/api/generate/retry/:id`

- [ ] **7.2.4** Add generation settings panel
  - Strategy selection dropdown
  - Limit input field

---

## Phase 8: Polish & Documentation

Final touches and documentation.

### 8.1 Error Handling

- [ ] **8.1.1** Review all error paths
  - Ensure errors are caught and logged
  - User-friendly error messages in CLI

- [ ] **8.1.2** Add graceful shutdown handling
  - Catch SIGINT/SIGTERM
  - Save progress before exit

- [ ] **8.1.3** Add database backup/restore
  - `pnpm run backup` command
  - Export database to JSON

### 8.2 Logging

- [ ] **8.2.1** Add structured logging
  - Use consistent log format
  - Log levels: debug, info, warn, error

- [ ] **8.2.2** Add file logging option
  - Write logs to `logs/` directory
  - Rotate logs by date

### 8.3 Documentation

- [ ] **8.3.1** Update README.md
  - Project overview
  - Setup instructions
  - Usage examples

- [ ] **8.3.2** Document environment variables
  - Required vs optional
  - How to obtain API keys

- [ ] **8.3.3** Document common workflows
  - Full generation from scratch
  - Resuming interrupted generation
  - Regenerating failed tiles

### 8.4 Performance

- [ ] **8.4.1** Profile generation pipeline
  - Identify bottlenecks
  - Optimize hot paths

- [ ] **8.4.2** Add caching where beneficial
  - Cache GCS URLs
  - Cache neighbor lookups

- [ ] **8.4.3** Optimize database queries
  - Add indexes if needed
  - Batch updates where possible

---

## Phase Order

Phases are executed sequentially:

```
Phase 1 (Setup)
    │
    v
Phase 2 (Database & Grid)
    │
    v
Phase 3 (Dashboard)
    │
    v
Phase 4 (Geometry Rendering)
    │
    v
Phase 5 (AI Style Transfer)
    │
    v
Phase 6 (Assembly & Viewer)
    │
    v
Phase 7 (Dashboard Controls)
    │
    v
Phase 8 (Polish)
```

Complete each phase before starting the next.
