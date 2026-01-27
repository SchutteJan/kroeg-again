# Kroeg Pixel Art

Generate an isometric pixel art map of Amsterdam city center. The pipeline renders 3D tiles from
Google Maps, converts renders to pixel art via Oxen.ai, and stitches tiles into a Deep Zoom Image
viewer with a live dashboard.

## Requirements

- Node.js (see `package.json` for the package manager version)
- `pnpm`
- Google Maps 3D Tiles API key
- Oxen.ai API key
- Google Cloud Storage bucket with public read access for infill uploads

## Setup

```bash
pnpm install
cp .env.example .env
```

Populate `.env` with:

- `OXEN_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `GCS_BUCKET`

## Configuration

Pipeline settings live in `config.json`. Defaults cover Amsterdam city center within the A10 ring
highway and a 512x512 tile size. Update bounds, tile size, zoom level, and Oxen model to fit your
run.

## CLI Usage

Run commands via `pnpm` during development:

```bash
pnpm run dev -- <command>
```

Or build and use the CLI binary:

```bash
pnpm run build
./dist/index.js <command>
```

### Commands

- `init` - initialize the SQLite database and generate the tile grid.
- `render` - render geometry tiles from Google Maps 3D Tiles.
- `generate` - generate pixel art tiles via Oxen.ai.
- `assemble` - assemble tiles into a Deep Zoom Image output.
- `serve` - serve the viewer locally.
- `status` - show generation progress.
- `dashboard` - launch the live generation dashboard.
- `backup` - backup the SQLite database.
- `restore` - restore the SQLite database from a backup.

Run `pnpm run dev -- <command> --help` to see flags and options for each command.

### Typical flow

```bash
pnpm run dev -- init
pnpm run dev -- render --all
pnpm run dev -- generate --continue
pnpm run dev -- assemble
pnpm run dev -- serve
```

## Dashboard

The dashboard shows tile status, progress, and errors in real time using Server-Sent Events. Start
it with:

```bash
pnpm run dev -- dashboard
```

## Viewer output

The `assemble` command writes Deep Zoom Image output into `output/`, along with viewer assets.
Serve them locally with `pnpm run dev -- serve`.

## Testing

```bash
pnpm run test
pnpm run lint
pnpm run typecheck
```

## Repository layout

- `src/` - pipeline source code and CLI commands
- `dashboard/` - dashboard static assets
- `data/` - SQLite database
- `renders/` - geometry renders
- `tiles/` - generated pixel art tiles
- `output/` - assembled Deep Zoom output and viewer assets

## Spec

See `SPEC.md` and `IMPLEMENTATION_PLAN.md` for the detailed system design and task breakdown.
