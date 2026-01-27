# Amsterdam Isometric Pixel Art Map — Spec

## Open Questions

_None at this time._

## Overview

Generate an isometric pixel art map of Amsterdam city center using AI image generation. The system
renders 3D geometry from Google Maps tiles, converts renders to pixel art via image generation
models, and stitches tiles into a browsable gigapixel map.

**Inspiration**: [Isometric NYC](https://cannoneyed.com/projects/isometric-nyc) by Andy Coenen.

### Reference Task Files

The `tasks/` directory contains task descriptions from the NYC project for reference:

| File | Topic |
|------|-------|
| `004_tiles.md` | Tile generation with assets (whitebox, render, view.json) |
| `005_oxen_api.md` | Oxen API inference + GCS setup |
| `006_infill_dataset.md` | Synthetic data for quadrant infill |
| `007_e2e_generation.md` | E2E generation with SQLite schema |
| `009_inpainting.md` | Arbitrary infill fine-tuning dataset |
| `010_omni_generation_dataset.md` | Combined training dataset |
| `012_generation_rules.md` | Generation rules library + validation |
| `013_generation_app.md` | Wiring generation to web app |
| `014_bounds_app.md` | Tile boundary visualization |
| `015_automatic_generation.md` | Automated generation algorithm |
| `016_generation_playbook.md` | Batch generation script |
| `018_water_fix.md` | Water pixel color replacement |
| `019_strip_plan.md` | Strip-based generation planning |

These files document the NYC project's approach and can inform implementation decisions.

## Goals

- Generate a complete isometric pixel art map of Amsterdam within the A10 ring highway
- Use Oxen.ai for image generation (cloud-based, no self-hosted GPU infrastructure)
- Produce a web-based gigapixel viewer using OpenSeaDragon
- Provide a live generation dashboard to monitor progress and control the pipeline
- Configurable geographic bounds with sensible defaults

## Non-Goals

- Training a new model from scratch
- Special water/canal detection or correction
- Interactive map features beyond pan/zoom
- Multiple output formats

## Art Style

Reference image: `artstyle.jpeg`

Style characteristics:
- Isometric projection (~30° angle, 2:1 pixel ratio)
- Visible pixel texture (not smooth/anti-aliased)
- Dutch canal house architecture with characteristic gabled roofs
- Warm autumn color palette (reds, browns, creams, orange/yellow foliage)
- Small-scale details: people, cars, boats, street furniture
- Dense urban layout

## Geographic Configuration

### Default Bounds

Amsterdam city center within the A10 ring highway:

```typescript
interface GeoBounds {
  north: number; // latitude
  south: number; // latitude
  east: number;  // longitude
  west: number;  // longitude
}

const DEFAULT_BOUNDS: GeoBounds = {
  north: 52.4000,
  south: 52.3400,
  east: 4.9500,
  west: 4.8500,
};
```

### Configuration

All settings configurable via `config.json`:

```json
{
  "bounds": {
    "north": 52.4000,
    "south": 52.3400,
    "east": 4.9500,
    "west": 4.8500
  },
  "tileSize": 512,
  "zoomLevel": 18,
  "oxen": {
    "model": "your-oxen-model-id",
    "numInferenceSteps": 28
  },
  "gcs": {
    "bucket": "amsterdam-pixelart-infills"
  }
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Pipeline Stages                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Grid Generation     2. Geometry Render    3. Pixel Art Gen  │
│  ┌─────────────────┐   ┌─────────────────┐   ┌───────────────┐  │
│  │ GeoBounds       │──▶│ Google Maps 3D  │──▶│ Oxen.ai       │  │
│  │ → Tile Grid     │   │ → Three.js      │   │ → Pixel Art   │  │
│  │ → SQLite        │   │ → PNG Render    │   │ → Final Tile  │  │
│  └─────────────────┘   └─────────────────┘   └───────────────┘  │
│                                                                 │
│  4. Infill Loop         5. Assembly          6. Viewer          │
│  ┌─────────────────┐   ┌─────────────────┐   ┌───────────────┐  │
│  │ Masked Gen      │──▶│ Tile Stitching  │──▶│ OpenSeaDragon │  │
│  │ 2x2 Quadrants   │   │ Zoom Levels     │   │ Web App       │  │
│  │ Seam Avoidance  │   │ DZI Format      │   │               │  │
│  └─────────────────┘   └─────────────────┘   └───────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Tile System

### Tile Dimensions

- **Tile size**: 512×512 pixels
- **Generation unit**: 2×2 quadrant (1024×1024 pixels, yields 4 tiles)
- **Estimated tiles**: ~10,000–15,000 for Amsterdam center

### Grid Coordinate System

```typescript
interface TileCoord {
  x: number; // column index (0-based, left to right)
  y: number; // row index (0-based, top to bottom)
}

interface Tile {
  id: string;           // "tile_{x}_{y}"
  coord: TileCoord;
  bounds: GeoBounds;    // geographic bounds of this tile
  status: TileStatus;
  renderPath?: string;  // path to geometry render
  outputPath?: string;  // path to final pixel art
  createdAt: Date;
  updatedAt: Date;
}

type TileStatus =
  | "pending"      // not started
  | "rendered"     // geometry render complete
  | "generating"   // pixel art generation in progress
  | "complete"     // pixel art complete
  | "failed";      // generation failed
```

### Quadrant Generation

Tiles are generated in 2×2 quadrants to ensure seamless edges:

```typescript
interface Quadrant {
  id: string;           // "quad_{qx}_{qy}"
  tiles: [Tile, Tile, Tile, Tile]; // top-left, top-right, bottom-left, bottom-right
  status: QuadrantStatus;
  mask?: string;        // path to mask image for infill
}

type QuadrantStatus =
  | "pending"
  | "generating"
  | "complete"
  | "failed";
```

## Stage 1: Grid Generation

Generate tile grid from geographic bounds.

```typescript
function generateGrid(bounds: GeoBounds, tileSize: number, zoomLevel: number): Tile[];
```

- Use a **simple grid**: intersect the requested bounds with the **slippy tile grid** at
  `zoomLevel` (Web Mercator). Compute all slippy tiles that overlap the bounds.
- Each tile record stores the exact geographic bounds derived from the slippy tile's lat/long
  edges.
- Create tile records in SQLite with status "pending".

## Stage 2: Geometry Rendering

Render 3D geometry from Google Maps tiles using Three.js with orthographic camera.

### Three.js Setup

```typescript
interface RenderConfig {
  width: number;        // 512
  height: number;       // 512
  cameraAngle: number;  // isometric angle in degrees (~30)
  cameraZoom: number;   // orthographic zoom level
}
```

### Isometric Camera

- Orthographic projection (no perspective distortion)
- 30° rotation for isometric view
- 2:1 pixel ratio for true isometric
- Camera faces **north** (rotation aligned so the "top" of the output image is north)

### Google Maps 3D Tiles

- Use Google Maps 3D Tiles API for geometry and textures
- Render each tile's geographic bounds
- Rendering runs **headless** using a WebGL-capable environment (headless Chromium).
- Output: PNG image per tile in `renders/` directory

## Stage 3: Pixel Art Generation

Convert geometry renders to pixel art using image generation models.

### Oxen.ai Image Generation

Use [Oxen.ai](https://oxen.ai) API for image-to-image generation, similar to the NYC project.

#### Workflow

1. Create infill image (composite of render + neighboring completed tiles)
2. Upload infill image to Google Cloud Storage (public URL required)
3. Call Oxen.ai API with image URL and prompt
4. Download generated image result

#### API Request

```typescript
interface OxenGenerationRequest {
  model: string;              // oxen.ai model identifier
  input_image: string;        // public URL to infill image
  prompt: string;
  num_inference_steps: number; // default: 28
}

// POST https://hub.oxen.ai/api/images/edit
// Authorization: Bearer $OXEN_API_KEY
```

Example curl:

```bash
curl -X POST \
  -H "Authorization: Bearer $OXEN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-model-id",
    "input_image": "https://storage.googleapis.com/bucket/infill.png",
    "prompt": "Convert the right side of the image to <isometric pixel art> in precisely the style of the left side.",
    "num_inference_steps": 28
  }' https://hub.oxen.ai/api/images/edit
```

#### TypeScript Interface

```typescript
interface GenerationRequest {
  inputImagePath: string;     // local path to infill image
  gcsUrl?: string;            // uploaded GCS URL (set after upload)
  prompt: string;
}

interface GenerationResult {
  outputUrl: string;          // URL to generated image
  outputPath: string;         // local path after download
  success: boolean;
  error?: string;
}
```

### Prompt Template

```typescript
const PROMPT_TEMPLATE = `
Convert the image to isometric pixel art with visible pixels and a warm autumn palette.
Include Dutch architecture, gabled roofs, canals, and small details like people, cars, and boats.
`;
```

### Reference Image

The file `artstyle.jpeg` defines the target pixel art style and is used to fine-tune the model.
Prompts can stay minimal and descriptive.

## Stage 4: Infill Generation

Generate tiles using masked infill to ensure seamless edges with adjacent tiles.

### Infill Rules

1. Start from a seed tile (center of map or random)
2. Generate tiles adjacent to completed tiles
3. Use mask to preserve overlap region from completed neighbors
4. No quadrant may be generated without at least **one completed neighbor per edge**

### Mask Generation

```typescript
interface InfillMask {
  quadrant: Quadrant;
  maskImage: Buffer;     // PNG with alpha channel
  overlapPixels: number; // pixels of overlap (e.g., 64)
}

function generateMask(quadrant: Quadrant, completedNeighbors: Tile[]): InfillMask;
```

### Quadrant IO Size

- Each generation call operates on a **1024×1024** quadrant image.
- The mask indicates the regions to be generated, preserving completed neighbors.
- The output is split into four 512×512 tiles.

### Infill Template Shapes

Generation templates follow quadrant-based rules to avoid seams. Allowed selections:
- 1x1 (single quadrant)
- 1x2 (vertical pair)
- 2x1 (horizontal pair)
- 2x2 (full tile)

Neighbor constraints:
- 1x1: may have up to 3 generated neighbors
- 1x2: cannot have generated neighbors on both left and right
- 2x1: cannot have generated neighbors on both top and bottom
- 2x2: cannot have any generated neighbors

These rules ensure that every generated edge has adjacent generated pixels in the template.

### Generation Order

```typescript
type GenerationStrategy = "spiral" | "random" | "row-by-row";

function getNextQuadrant(
  strategy: GenerationStrategy,
  completed: Set<string>,
  pending: Quadrant[]
): Quadrant | null;
```

Default strategy: `spiral` (start center, expand outward).

### Edge Quadrants

- Prefer full 2×2 quadrants for seam control.
- If the grid edge produces incomplete 2×2 groups, generate a partial quadrant by padding
  missing tiles with transparency in the input, then discard out-of-bounds tiles on output.

## Stage 5: Assembly

Stitch completed tiles into zoom pyramid for OpenSeaDragon.

### Deep Zoom Image (DZI) Format

```
output/
├── amsterdam.dzi           # DZI descriptor
└── amsterdam_files/
    ├── 0/                  # zoom level 0 (smallest)
    │   └── 0_0.jpg
    ├── 1/
    │   ├── 0_0.jpg
    │   └── 0_1.jpg
    ...
    └── 18/                 # zoom level 18 (full resolution)
        ├── 0_0.jpg
        ├── 0_1.jpg
        ...
```

### Assembly Process

```typescript
function assembleDZI(tiles: Tile[], outputDir: string): void;
```

- Validate all tiles are complete
- Generate zoom pyramid directly from the 512×512 tiles (no full-res stitched image)
- Output DZI descriptor XML

## Stage 6: Web Viewer

Simple web application using OpenSeaDragon.

### Directory Structure

```
viewer/
├── index.html
├── style.css
└── app.js
```

### OpenSeaDragon Configuration

```javascript
const viewer = OpenSeaDragon({
  id: "map-container",
  tileSources: "amsterdam.dzi",
  prefixUrl: "https://cdn.jsdelivr.net/npm/openseadragon/build/openseadragon/images/",
  showNavigator: true,
  navigatorPosition: "BOTTOM_RIGHT",
  minZoomLevel: 0.5,
  maxZoomLevel: 10,
  defaultZoomLevel: 1,
});
```

## Stage 7: Generation Dashboard

Live monitoring dashboard to visualize generation progress in real-time.

### Overview

A web-based control panel that displays:
- Grid visualization showing tile status (color-coded)
- Real-time progress statistics
- Currently generating tiles
- Generation queue
- Error log

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Amsterdam Pixel Art Generator                          [Start] [Pause] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────┐  ┌──────────────────────────┐  │
│  │                                     │  │ Progress                 │  │
│  │           Tile Grid                 │  │ ────────────────────────│  │
│  │                                     │  │ Total:      12,450      │  │
│  │    ░░░░░░░░░░░░░░░░░░░░░░░         │  │ Pending:     8,230  66% │  │
│  │    ░░░░░░░░░░░░░░░░░░░░░░░         │  │ Rendered:    2,100  17% │  │
│  │    ░░░░░░░▓▓▓▓▓▓▓░░░░░░░░░         │  │ Generating:      4   0% │  │
│  │    ░░░░░░▓▓████▓▓░░░░░░░░░         │  │ Complete:    2,100  17% │  │
│  │    ░░░░░░▓▓████▓▓░░░░░░░░░         │  │ Failed:         16   0% │  │
│  │    ░░░░░░░▓▓▓▓▓▓▓░░░░░░░░░         │  │                          │  │
│  │    ░░░░░░░░░░░░░░░░░░░░░░░         │  │ Rate: 180 tiles/hour     │  │
│  │    ░░░░░░░░░░░░░░░░░░░░░░░         │  │ ETA:  ~46 hours          │  │
│  │                                     │  └──────────────────────────┘  │
│  │  Legend:                            │                                │
│  │  ░ Pending  ▒ Rendered  ▓ Generating│  ┌──────────────────────────┐  │
│  │  █ Complete  ▪ Failed               │  │ Currently Generating     │  │
│  │                                     │  │ ────────────────────────│  │
│  └─────────────────────────────────────┘  │ quad_45_32  00:12        │  │
│                                           │ quad_45_33  00:08        │  │
│  ┌─────────────────────────────────────┐  │ quad_46_32  00:05        │  │
│  │ Recent Errors                       │  │ quad_46_33  00:02        │  │
│  │ ─────────────────────────────────── │  └──────────────────────────┘  │
│  │ tile_89_64: Rate limit exceeded     │                                │
│  │ tile_90_65: Model timeout           │                                │
│  └─────────────────────────────────────┘                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Tile Status Colors

```typescript
const STATUS_COLORS = {
  pending: "#374151",     // gray-700
  rendered: "#1e40af",    // blue-800
  generating: "#d97706",  // amber-600 (animated pulse)
  complete: "#059669",    // emerald-600
  failed: "#dc2626",      // red-600
};
```

### Real-time Updates

The dashboard uses Server-Sent Events (SSE) for live updates:

```typescript
interface TileUpdate {
  type: "tile_status" | "progress" | "error";
  tileId?: string;
  status?: TileStatus;
  progress?: ProgressStats;
  error?: ErrorInfo;
  timestamp: string;
}

interface ProgressStats {
  total: number;
  pending: number;
  rendered: number;
  generating: number;
  complete: number;
  failed: number;
  ratePerHour: number;
  etaMinutes: number | null;
}

interface ErrorInfo {
  tileId: string;
  message: string;
  timestamp: string;
}
```

### Update Mechanism

- The dashboard SSE endpoint streams updates by **polling SQLite** for changes at a fixed
  interval (e.g., 1s) and emitting deltas.
- The generation pipeline only writes to SQLite; it does not need to run in the same process as
  the dashboard.

### Dashboard API Endpoints

```
GET  /api/tiles              # All tiles with status
GET  /api/tiles/:id          # Single tile details
GET  /api/progress           # Current progress stats
GET  /api/events             # SSE stream for live updates
POST /api/generate/start     # Start generation
POST /api/generate/pause     # Pause generation
POST /api/generate/retry/:id # Retry failed tile
```

### Interactive Features

- **Click tile**: Show tile details (coordinates, timestamps, preview if available)
- **Zoom/pan grid**: Navigate large grids
- **Filter by status**: Show only pending/failed/etc.
- **Start/Pause**: Control generation from dashboard
- **Retry failed**: Click failed tiles to retry

### Directory Structure

```
dashboard/
├── index.html
├── style.css
├── app.js
└── components/
    ├── grid.js          # Tile grid visualization
    ├── progress.js      # Progress panel
    ├── errors.js        # Error log panel
    └── controls.js      # Start/pause controls
```

### CLI Integration

```bash
pnpm run dashboard
```

- Starts dashboard server on port 3001
- Opens browser automatically
- Can run alongside `pnpm run generate`

## Database Schema

SQLite database for tile metadata and generation state.

### Tables

```sql
CREATE TABLE tiles (
  id TEXT PRIMARY KEY,          -- "tile_{x}_{y}"
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  north REAL NOT NULL,
  south REAL NOT NULL,
  east REAL NOT NULL,
  west REAL NOT NULL,
  render_path TEXT,
  output_path TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tiles_status ON tiles(status);
CREATE INDEX idx_tiles_coords ON tiles(x, y);

CREATE TABLE quadrants (
  id TEXT PRIMARY KEY,          -- "quad_{qx}_{qy}"
  qx INTEGER NOT NULL,
  qy INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  tile_tl TEXT REFERENCES tiles(id),
  tile_tr TEXT REFERENCES tiles(id),
  tile_bl TEXT REFERENCES tiles(id),
  tile_br TEXT REFERENCES tiles(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quadrants_status ON quadrants(status);

CREATE TABLE generation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quadrant_id TEXT REFERENCES quadrants(id),
  model TEXT NOT NULL,
  prompt TEXT NOT NULL,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  success INTEGER,
  error_message TEXT
);
```

## CLI Commands

### Initialize Project

```bash
pnpm run init
```

- Create SQLite database
- Generate tile grid from config
- Create directory structure

### Render Geometry

```bash
pnpm run render [--tile=x,y] [--all]
```

- Render 3D geometry for specified tile or all pending tiles
- Update tile status to "rendered"

### Generate Pixel Art

```bash
pnpm run generate [--tile=x,y] [--quadrant=qx,qy] [--continue] [--limit=N]
```

- `--tile=x,y`: Generate a single tile (useful for testing the pipeline)
- `--quadrant=qx,qy`: Generate a specific quadrant
- `--continue`: Resume from where generation left off
- `--limit=N`: Generate at most N quadrants

Single tile mode skips infill/masking and generates the tile in isolation—useful for
verifying the Oxen.ai integration before running full generation.

### Assemble Viewer

```bash
pnpm run assemble
```

- Stitch tiles into DZI format
- Generate viewer HTML

### Serve Viewer

```bash
pnpm run serve
```

- Start local HTTP server for viewer
- Default port: 3000

### Status

```bash
pnpm run status
```

- Show generation progress
- Tile counts by status
- Estimated completion

### Dashboard

```bash
pnpm run dashboard
```

- Start live monitoring dashboard on port 3001
- Shows tile grid with status colors
- Real-time progress updates via SSE
- Control generation (start/pause/retry)
- Opens browser automatically

## Directory Structure

```
kroeg-pixelart/
├── package.json
├── config.json              # geographic bounds, settings
├── artstyle.jpeg            # style reference image
├── SPEC.md                  # this file
├── IMPLEMENTATION_PLAN.md   # tasks
├── src/
│   ├── index.ts             # CLI entry point
│   ├── config.ts            # configuration loading
│   ├── db.ts                # SQLite operations
│   ├── grid.ts              # grid generation
│   ├── render.ts            # Three.js geometry rendering
│   ├── generate.ts          # AI image generation orchestration
│   ├── oxen.ts              # Oxen.ai API client
│   ├── gcs.ts               # Google Cloud Storage upload
│   ├── infill.ts            # mask generation, infill logic
│   ├── assemble.ts          # DZI assembly
│   ├── types.ts             # shared TypeScript types
│   └── dashboard/
│       ├── server.ts        # Express server + SSE
│       ├── routes.ts        # API routes
│       └── events.ts        # Event emitter for tile updates
├── data/
│   └── amsterdam.db         # SQLite database
├── renders/                 # geometry renders (intermediate)
│   └── tile_{x}_{y}.png
├── tiles/                   # final pixel art tiles
│   └── tile_{x}_{y}.png
├── output/                  # assembled viewer
│   ├── amsterdam.dzi
│   ├── amsterdam_files/
│   └── viewer/
│       ├── index.html
│       ├── style.css
│       └── app.js
├── dashboard/               # dashboard static files
│   ├── index.html
│   ├── style.css
│   └── app.js
└── node_modules/
```

## Dependencies

```json
{
  "dependencies": {
    "@google-cloud/storage": "^7.0.0",
    "better-sqlite3": "^11.0.0",
    "commander": "^12.0.0",
    "express": "^4.21.0",
    "open": "^10.0.0",
    "sharp": "^0.33.0",
    "three": "^0.170.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/express": "^5.0.0",
    "@types/node": "^22.0.0",
    "@types/three": "^0.170.0",
    "typescript": "^5.6.0",
    "tsx": "^4.0.0"
  }
}
```

## External Services

### Google Maps 3D Tiles API

- Required for geometry rendering
- API key stored in environment variable `GOOGLE_MAPS_API_KEY`
- Rate limits apply; implement backoff

### Oxen.ai API

- Image generation via `https://hub.oxen.ai/api/images/edit`
- API key stored in environment variable `OXEN_API_KEY`
- Rate limits apply; implement backoff

```typescript
interface OxenConfig {
  model: string;              // oxen.ai model identifier
  numInferenceSteps: number;  // default: 28
}
```

### Google Cloud Storage

- Required for hosting input images (Oxen.ai requires public URLs)
- Bucket must be publicly readable
- Authentication via Application Default Credentials or service account

```bash
# Setup commands
gcloud storage buckets create gs://amsterdam-pixelart-infills --location=europe-west4
gcloud storage buckets add-iam-policy-binding gs://amsterdam-pixelart-infills \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

Environment variables:
- `GCS_BUCKET`: Bucket name for infill images
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account key (optional, for production)

## Error Handling

### Retry Strategy

- Stop on first failure; failed tiles are marked with status "failed" and error_message
- Retries are **manual**: `pnpm run generate --retry-failed`
- Each retry creates a new `generation_log` entry and updates status to "generating" during the retry

### Resumability

- All state persisted in SQLite
- Generation can be stopped and resumed at any time
- No duplicate work on restart

## Testing

### Unit Tests

- Grid calculation
- Mask generation
- DZI assembly

### Integration Tests

- Single tile end-to-end (render → generate → output)
- Verify tile dimensions and format

### Manual QA

- Visual inspection of generated tiles
- Seam checking at tile boundaries
