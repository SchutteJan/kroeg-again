# Kroeg App - Design Document

## Overview

This application curates Amsterdam location data from the Gemeente Amsterdam alcohol license dataset. 
An AI agent processes uncurated locations and labels them (bar, restaurant, coffeeshop, etc.). 
Humans can review and override these decisions. 
The primary use case is identifying "kroegen" (bars), but all location types are recorded.

## Tech Stack

- **Framework**: React Router v7 (full-stack)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: PGLite with Drizzle ORM
- **Authentication**:
  - better-auth for web users
  - API keys for agent authentication
- **API**: REST endpoints via React Router resource routes

add dependencies by running `pnpm add`, do not update package.json directly.

## Data Model

### Location Labels

The agent assigns one of these labels to each location:

| Label | Description |
|-------|-------------|
| `bar` | Traditional kroeg/pub - primary focus is drinking |
| `wine_bar` | Wine-focused drinking establishment |
| `coffeeshop_weed` | Cannabis coffeeshop |
| `coffeeshop_cafe` | Coffee/café establishment (no cannabis) |
| `restaurant` | Primary focus is food service |
| `hotel_bar` | Bar inside a hotel |
| `event_space` | Event venue with alcohol license |
| `sportkantine` | Sports club canteen |
| `other` | Doesn't fit other categories |

### Core Entities

```
┌─────────────────────┐     ┌──────────────────────┐
│   licenses          │     │      locations       │
├─────────────────────┤     ├──────────────────────┤
│ id (PK)             │     │ id (PK)              │
│ feature_id (unique) │◄────│ current_license_id   │
│ zaaknummer          │     │ name                 │
│ zaaknaam            │     │ address              │
│ adres               │     │ postcode             │
│ zaak_categorie      │     │ coordinates (json)   │
│ zaak_specificatie   │     │ label                │
│ begindatum          │     │ is_published         │
│ einddatum           │     │ created_at           │
│ coordinates (json)  │     │ updated_at           │
│ postcode            │     └──────────────────────┘
│ status_vergunning   │              │
│ opening_hours (json)│     ┌────────┴─────────────┐
│ terras_hours (json) │     │  location_licenses   │
│ raw_data (json)     │     │  (history tracking)  │
│ first_seen_at       │     ├──────────────────────┤
│ last_seen_at        │     │ id (PK)              │
│ created_at          │     │ location_id (FK)     │
└─────────────────────┘     │ license_id (FK)      │
         │                  │ matched_at           │
         │                  │ matched_by           │
         ▼                  └──────────────────────┘
┌─────────────────────┐
│ curation_decisions  │
├─────────────────────┤
│ id (PK)             │
│ license_id (FK)     │
│ label               │  (bar | wine_bar | coffeeshop_weed | ...)
│ sanitized_name      │  (cleaned-up name for display)
│ reasoning           │
│ decided_by          │  (ai_agent | user_id)
│ decision_type       │  (ai | human_override)
│ human_verified      │
│ human_verified_by   │
│ human_verified_at   │
│ created_at          │
└─────────────────────┘
```

### Entity Descriptions

**licenses**: Raw license data from Amsterdam dataset
- `feature_id`: Unique key from GeoJSON (e.g., "exploitatievergunning.266500627")
- `first_seen_at` / `last_seen_at`: Track when license appeared/last appeared in dataset
- `raw_data`: Full original GeoJSON properties for reference

**locations**: Curated locations in the system
- Links to current active license
- `label`: The type of location (bar, restaurant, etc.)
- `name`: Sanitized/corrected name (may differ from license zaaknaam)
- `is_published`: Whether visible to end users

**location_licenses**: Historical link between locations and their licenses over time
- A location may have multiple licenses over its lifetime
- Used to detect when a location changes license or closes

**curation_decisions**: Record of all curation decisions
- `label`: The assigned location type
- `sanitized_name`: Cleaned-up name for the location
- `reasoning`: Explanation of why the decision was made
- `decision_type`: Whether AI or human made the decision
- `human_verified`: Whether a human has signed off on AI decision

## Curation Workflow

```
┌─────────────┐    sync    ┌─────────────┐
│  Amsterdam  │ ────────► │  licenses   │
│  GeoJSON    │           │  (raw data) │
└─────────────┘           └──────┬──────┘
                                 │
                                 │ uncurated
                                 ▼
                    ┌────────────────────────┐
                    │   AI Agent / Human     │
                    │ POST /api/curation/decide│
                    └────────────┬───────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
           ┌──────────────┐ ┌──────────┐ ┌─────────────────┐
           │   location   │ │ decision │ │ location_license│
           │ (unverified) │ │ (record) │ │    (link)       │
           └──────┬───────┘ └──────────┘ └─────────────────┘
                  │
                  │ human review
                  ▼
           ┌──────────────┐
           │   location   │
           │ (verified)   │
           │ is_published │
           └──────────────┘
```

### When a Curation Decision is Made (POST /api/curation/decide)

1. **Create curation_decision** record with label, name, reasoning
2. **Create location** record immediately:
   - `name` = sanitized_name from decision
   - `label` = label from decision
   - `is_published` = false (unverified)
   - `current_license_id` = the license being curated
3. **Create location_license** link between location and license
4. Return `decision_id` and `location_id`

### When Location is Verified (POST /api/curation/verify)

**If approved:**
- Set `location.is_published = true`
- Set `decision.human_verified = true`

**If overridden:**
- Update `location.label` and `location.name` with override values
- Create new `curation_decision` with `decision_type = human_override`
- Set `location.is_published = true`

### Location States

| State | is_published | Description |
|-------|--------------|-------------|
| Unverified | false | AI decided, awaiting human review |
| Verified | true | Human approved AI decision |
| Overridden | true | Human changed AI decision |

## API Design

### Authentication

- **Web users**: better-auth session cookies
- **AI agent**: API key via `Authorization: Bearer <api_key>` header

### Curation Endpoints

#### 1. GET /api/curation/uncurated

Get locations that need curation decisions.

**Query Parameters:**
- `limit` (optional, default: 10, max: 100)
- `category` (optional): Filter by zaak_categorie

**Response:**
```json
{
  "items": [
    {
      "id": 1,
      "feature_id": "exploitatievergunning.266500627",
      "zaaknaam": "Café Oost",
      "adres": "Krugerplein 40",
      "postcode": "1091LA",
      "zaak_categorie": "Café",
      "zaak_specificatie": "Café",
      "coordinates": {
        "lat": 52.353454814964415,
        "lng": 4.919830202521983
      },
      "opening_hours": {
        "zo_do": { "van": "07.00", "tot": "01.00" },
        "vr_za": { "van": "07.00", "tot": "03.00" }
      },
      "begindatum": "2022-02-01",
      "einddatum": "2027-02-01",
      "status_vergunning": "Verleend"
    }
  ],
  "total_uncurated": 150
}
```

#### 2. POST /api/curation/decide

Submit a curation decision for a location.

**Request Body:**
```json
{
  "license_id": 1,
  "label": "bar",
  "sanitized_name": "Café Oost",
  "reasoning": "This is a traditional café based on category 'Café' and name 'Café Oost'. Opening hours indicate evening focus with late closing times typical of a kroeg."
}
```

**Labels:** `bar` | `wine_bar` | `coffeeshop_weed` | `coffeeshop_cafe` | `restaurant` | `hotel_bar` | `event_space` | `sportkantine` | `other`

**Response:**
```json
{
  "decision_id": 42,
  "location_id": 15,
  "status": "pending_verification",
  "message": "Location created (unpublished), awaiting human verification"
}
```

#### 3. GET /api/curation/stats

Get curation statistics.

**Response:**
```json
{
  "total_licenses": 500,
  "uncurated": 150,
  "curated": 350,
  "by_label": {
    "bar": 180,
    "wine_bar": 12,
    "coffeeshop_weed": 25,
    "coffeeshop_cafe": 40,
    "restaurant": 60,
    "hotel_bar": 8,
    "event_space": 5,
    "sportkantine": 10,
    "other": 10
  },
  "pending_verification": 45,
  "verified": 305
}
```

#### 4. POST /api/licenses/sync

Sync licenses from external GeoJSON source. Detects new, updated, and removed licenses.

**Request Body:**
```json
{
  "source_url": "https://api.data.amsterdam.nl/..."
}
```

**Response:**
```json
{
  "added": 5,
  "updated": 12,
  "marked_inactive": 2
}
```

### Verification Endpoints (Admin only)

#### 5. GET /api/curation/pending

Get locations pending verification.

**Response:**
```json
{
  "items": [
    {
      "location_id": 15,
      "decision_id": 42,
      "license": { /* license data */ },
      "location": {
        "name": "Café Oost",
        "label": "bar",
        "address": "Krugerplein 40",
        "is_published": false
      },
      "ai_decision": {
        "label": "bar",
        "sanitized_name": "Café Oost",
        "reasoning": "..."
      },
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 6. POST /api/curation/verify

Verify or override a location (publishes it).

**Request Body (approve):**
```json
{
  "location_id": 15,
  "approved": true
}
```

**Request Body (override):**
```json
{
  "location_id": 15,
  "approved": false,
  "override_label": "coffeeshop_cafe",
  "override_name": "Café Oost Koffie",
  "override_reasoning": "This is actually a lunch café, not a kroeg - they don't serve alcohol"
}
```

**Response:**
```json
{
  "location_id": 15,
  "is_published": true,
  "label": "coffeeshop_cafe",
  "name": "Café Oost Koffie"
}
```

## License Matching Logic

### Detecting New Licenses
When syncing:
1. Compare incoming `feature_id` against existing licenses
2. New feature_ids = new licenses, marked as uncurated

### Detecting License Changes for Existing Locations
1. When a license expires or is no longer in the dataset
2. Search for potential successor licenses:
   - Same address
   - Similar name
   - Nearby coordinates
3. Flag for human review if uncertain

### Detecting Closed Locations
1. License no longer in dataset
2. No successor license found
3. Mark location as potentially closed
4. Human can confirm closure

## Application Pages

### Public Pages
- `/` - Home / Login
- `/map` - Map view of locations (filterable by label)
- `/list` - List view of locations (filterable by label)
- `/location/:id` - Individual location detail

### Admin Pages
- `/admin` - Dashboard with stats by label
- `/admin/pending` - Review AI decisions
- `/admin/locations` - Manage locations
- `/admin/licenses` - View/sync licenses

## Project Structure

```
kroeg-ts/
├── app/
│   ├── root.tsx                    # Root layout
│   ├── routes.ts                   # Route configuration
│   ├── routes/
│   │   ├── _index.tsx              # Home page
│   │   ├── map.tsx                 # Map view
│   │   ├── list.tsx                # List view
│   │   ├── location.$id.tsx        # Location detail
│   │   ├── admin._index.tsx        # Admin dashboard
│   │   ├── admin.pending.tsx       # Pending verifications
│   │   ├── admin.locations.tsx     # Manage locations
│   │   ├── admin.licenses.tsx      # View/sync licenses
│   │   └── api/
│   │       ├── curation.uncurated.ts  # GET /api/curation/uncurated
│   │       ├── curation.decide.ts     # POST /api/curation/decide
│   │       ├── curation.stats.ts      # GET /api/curation/stats
│   │       ├── curation.pending.ts    # GET /api/curation/pending
│   │       ├── curation.verify.ts     # POST /api/curation/verify
│   │       └── licenses.sync.ts       # POST /api/licenses/sync
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── license-card.tsx
│   │   ├── decision-form.tsx
│   │   └── stats-card.tsx
│   └── lib/
│       ├── utils.ts
│       └── auth.ts                 # better-auth setup
├── db/
│   ├── schema.ts                   # Drizzle schema
│   ├── index.ts                    # DB connection (PGLite)
│   └── migrations/
├── package.json
├── react-router.config.ts
├── tailwind.config.js
├── drizzle.config.ts
└── DESIGN.md
```

## Future Considerations

1. **Batch Processing**: Allow agent to submit multiple decisions at once
2. **Confidence Scores**: AI provides confidence level with decisions
3. **Photos Integration**: Link to Google Places or similar for venue photos
4. **Change Detection**: Alert when license data changes significantly
5. **Export**: Export curated locations by label (e.g., all bars for the kroeg app)
6. **Location Matching**: Agent can match new licenses to existing locations (same address, different license)
