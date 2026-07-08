# Superset App — API Analysis & Import Guide

> Analysis of the Superset fitness app API, captured via MITM proxy on a patched APK.
> For capture setup, see [Appendix: MITM Capture Setup](#appendix-mitm-capture-setup).

---

## Overview

| Property | Value |
|----------|-------|
| **Package** | `com.supersetapp.android` |
| **Developer** | SUPERSET WORLD, INC. |
| **Version Analyzed** | 0.1.155 (patched to report 0.1.164) |
| **Framework** | React Native + Expo SDK 52.0.0 |
| **JS Engine** | Hermes |
| **HTTP Client** | Axios → OkHttp 4.12.0 |
| **Base URL** | `https://www.supersetapp.com` |
| **Analysis Date** | February 2026 |

---

## Authentication

### POST /api/auth/login-token

Login with email/password. Returns user object with auth token.

```json
// Request
{
  "email": "user@example.com",
  "password": "password"
}

// Response 200
{
  "id": 12345,
  "first_name": "John",
  "last_name": "Doe",
  "email": "user@example.com",
  "timezone": "Asia/Jerusalem",
  "is_creator": false,
  "creator_id": null,
  "creator_name": null,
  "coaches": [{"id": 216464, "first_name": "Coach", "last_name": "Name"}],
  "auth_token": "f05bd898118200e86f66b77e52f88264d30472fbfe021454c1588af2adcc4498",
  "toggles": {"feature_flag": true},
  "intercom_hash": "..."
}
```

### Required Headers (all API calls)

```
Authorization: Token <64-char-hex-token>
Content-Type: application/json
x-appversion: 0.1.164
x-appupdateid: 019c7223
x-device: google
User-Agent: okhttp/4.12.0
```

Missing `x-appversion`, `x-appupdateid`, or `x-device` results in **403 Forbidden**.

### Common Query Parameters

- `creator_id=<int>` — required on most endpoints (the coach's user ID)
- `_=<timestamp>` — cache buster (optional)

---

## User

### GET /api/users/me

Returns same structure as login response, plus `products`, `subscriptions`, `coaches` arrays.

---

## Programs

### GET /api/programming/client/programs?creator_id={id}

List all programs the client is enrolled in.

```json
[{
  "id": 137079,
  "name": "AlphaBuild",
  "creator_id": 216464,
  "start_date": "2025-06-08",
  "weeks": 52,
  "days_per_week": 4,
  "status": "active",
  "description": "...",
  "image": "https://..."
}]
```

---

## Workouts

### GET /api/programming/client/workouts?creator_id={id}&program_id={id}&type[]=client

List workouts in a program. **Paginated** (returns `count`, `next`, `previous`, `results`, `page_size`).

The `type[]` parameter filters workout types:
- `type[]=client` — template workouts (upcoming) AND their completions

Response contains both `client` (template) and `completion` (completed) records:

```json
{
  "count": 26,
  "next": null,
  "previous": null,
  "page_size": 50,
  "results": [
    {
      "id": 1985452,
      "type": "completion",
      "status": "complete",
      "original_id": 1985393,
      "name": "Workout 2",
      "completed_at": "2026-02-22T19:09:30.262003-05:00"
    },
    {
      "id": 1984938,
      "type": "client",
      "status": "incomplete",
      "original_id": null,
      "name": "Workout 2"
    }
  ]
}
```

**Workout types:**
| Type | Meaning |
|------|---------|
| `client` | Template workout from coach program (shows in "upcoming") |
| `completion` | Completed workout instance (shows in "completed") |

**Relationship:** `completion.original_id` → points to the `client` or `completion` it was created from.

### GET /api/programming/client/workouts/{id}?creator_id={id}

Full workout detail with exercises:

```json
{
  "id": 1984939,
  "uuid": "4924586f-6531-41b0-b477-bef22a759f58",
  "assigned_date": null,
  "name": "Workout 1",
  "description": "",
  "status": "incomplete",
  "type": "client",
  "day_offset": 0,
  "weight_unit": "kg",
  "effort_variant": "rir",
  "rir_tracking": true,
  "columns": [
    {"type": "sets"},
    {"type": "reps"},
    {"type": "weight", "units": "kg"},
    {"type": "rest"},
    {"type": "notes"}
  ],
  "completed_at": null,
  "edited_at": null,
  "difficulty": null,
  "duration_secs": null,
  "workout_exercises": [/* see Workout Exercises */],
  "previous_sets": {},
  "max_lifts": {}
}
```

---

## Workout Exercises

Each workout has a `workout_exercises` array with three possible types:

### type: "exercise" — Linked to exercise library

```json
{
  "id": 18974392,
  "uuid": "...",
  "position": 0,
  "type": "exercise",
  "circuit_id": null,
  "exercise": {
    "id": 338138,
    "type": "simple",
    "name": "Back Squat",
    "embed_video": "https://www.youtube.com/watch?v=QmZAiBqPvZw",
    "focus": "Legs",
    "description": "...",
    "video": null,
    "has_history": true
  },
  "exercise_name": "Back Squat",
  "replaced_exercise": null,
  "replaced_exercise_name": "",
  "metadata": [
    {"type": "sets", "value": "3"},
    {"type": "reps", "value": "6-8"},
    {"type": "weight", "value": "", "units": "kg"},
    {"type": "rest", "value": "2-3m"},
    {"type": "notes", "value": "Coach notes here"}
  ]
}
```

### type: "freeform" — Text-only instruction block

```json
{
  "id": 18974404,
  "type": "freeform",
  "exercise": null,
  "exercise_name": "Instructions Title",
  "description": "Long text instructions for the section...",
  "metadata": []
}
```

### type: "custom" — Circuit/superset header

```json
{
  "id": 18974400,
  "type": "custom",
  "exercise": null,
  "circuit_id": null,
  "exercise_name": "Superset Name",
  "metadata": [{"type": "sets", "value": "1"}]
}
```

### Circuit Grouping

Exercises with the same `circuit_id` form a superset/circuit. The `custom` entry whose `id` equals the `circuit_id` is the header.

Example: exercises with `circuit_id: 18974400` belong to the circuit headed by the `custom` entry with `id: 18974400`.

---

## Workout Completion

### POST /api/programming/client/workouts/{id}/complete

Complete a workout (first time). Creates a new `completion` record.

```json
// Request
{
  "difficulty": "low",
  "notes": "",
  "duration_secs": 22,
  "sets": [
    {
      "workout_exercise_id": 18974392,
      "set_index": 2,
      "status": "complete",
      "metadata": [
        {"type": "sets", "value": "2"},
        {"type": "weight", "value": "100", "units": "kg"},
        {"type": "reps", "value": "8"},
        {"type": "rir", "value": "2"}
      ]
    },
    {
      "workout_exercise_id": 18974392,
      "set_index": 3,
      "status": "complete",
      "metadata": [
        {"type": "sets", "value": "3"},
        {"type": "weight", "value": "100", "units": "kg"},
        {"type": "reps", "value": "7"},
        {"type": "rir", "value": "1"}
      ]
    }
  ],
  "exercise_notes": [
    {"videos": [], "workout_exercise_id": 18974393},
    {"notes": "per-exercise note", "videos": [], "workout_exercise_id": 18974392}
  ],
  "replacements": [],
  "original_workout": { /* full workout object as received from GET */ }
}

// Response 200
{
  "completed_at": "2026-02-22T19:01:16.662444-05:00",
  "difficulty": "low",
  "notes": "",
  "duration_secs": 22,
  "workout_id": 1985393
}
```

**Key details:**
- `workout_exercise_id` references `workout_exercises[].id` from the workout
- `set_index` is 1-based, matches the `sets` metadata value
- `exercise_notes` — one entry per workout_exercise; optional `"notes"` field for per-exercise text notes
- `notes` (top-level) — overall workout note
- `original_workout` must contain the full workout object from GET
- Response returns a NEW `workout_id` — completion creates a new record
- `difficulty`: `"low"` (Easy) | `"medium"` (Moderate) | `"high"` (Hard) | `null`

### Repeat Workout

Calling `POST /complete` on an **already-completed** workout creates another completion:

```
POST /api/programming/client/workouts/1985393/complete
→ creates workout_id 1985452 (new completion linked to 1985393)
```

- `original_workout.status` must be set to `"in_progress"` in the request
- `sets` can be empty (submits without set data)
- Each repeat creates a new `completion` record with its own `workout_id`

**This is the key mechanism for importing historical data** — complete the same workout repeatedly with different set data each time.

### PUT /api/programming/client/workouts/{id}/edit-completed?creator_id={id}

Edit an already-completed workout.

```json
// Request
{
  "completed_at": "2026-02-22T19:01:16.662444-05:00",
  "edited_at": "2026-02-23T00:06:43.412Z",
  "difficulty": "low",
  "notes": "",
  "duration_secs": 22,
  "sets": [
    {
      "workout_exercise_id": 18979176,
      "set_index": 1,
      "status": "complete",
      "metadata": [
        {"type": "sets", "value": "1"},
        {"type": "weight", "value": "140", "units": "kg"},
        {"type": "reps", "value": "6"},
        {"type": "rir", "value": "1"}
      ]
    }
  ],
  "exercise_notes": [
    {"videos": [], "workout_exercise_id": 18979175},
    {"notes": "optional per-exercise note", "videos": [], "workout_exercise_id": 18979176}
  ],
  "replacements": []
}

// Response 200
{
  "completed_at": "2026-02-22T19:01:16.662444-05:00",
  "difficulty": "low",
  "notes": "",
  "duration_secs": 22,
  "workout_id": 1985393
}
```

**Differences from POST /complete:**
- Uses PUT method
- Has `edited_at` field (ISO 8601 timestamp)
- Does NOT require `original_workout`
- Preserves original `completed_at` timestamp

### Exercise Replacement

Both `/complete` and `/edit-completed` support replacing exercises via the `replacements` array:

```json
"replacements": [
  {
    "workout_exercise_id": 18979182,
    "exercise_id": 350335
  }
]
```

This swaps `workout_exercise_id` 18979182 to use exercise 350335 (DB Goblet Squat) instead of its original exercise. The replacement is persisted with the completion.

### Completion Behavior Notes

- Completing a workout marks it as "complete" and moves it from "upcoming" to "completed" tab
- Removing all set values from an exercise within a completed workout unmarks that exercise as complete
- Completed workouts can always be edited via PUT `/edit-completed`
- The "repeat" button calls POST `/complete` on the completion record itself (not the original template)

---

## Exercise Library

### GET /api/programming/client/exercises?creator_id={id}&page={n}

Paginated list of all exercises available to the client (from coach's library).

```json
{
  "count": 1299,
  "next": "https://www.supersetapp.com/api/programming/client/exercises?creator_id=216464&page=2",
  "previous": null,
  "page_size": 50,
  "results": [
    {
      "id": 350335,
      "type": "simple",
      "name": "DB Goblet Squat",
      "embed_video": "https://www.youtube.com/watch?v=...",
      "focus": "Legs",
      "description": "",
      "video": null,
      "has_history": false
    }
  ]
}
```

Exercises are scoped to `creator_id`. No metadata distinguishes coach-created vs platform default exercises.

### GET /api/programming/client/exercises/{id}?creator_id={id}

Single exercise detail:

```json
{
  "id": 338138,
  "type": "simple",
  "name": "Back Squat",
  "embed_video": "https://www.youtube.com/watch?v=QmZAiBqPvZw",
  "focus": "",
  "description": "",
  "video": null,
  "has_history": true,
  "alternatives": []
}
```

---

## Exercise History & PRs

### GET /api/programming/client/exercise-history/{exercise_id}?creator_id={id}

Paginated history of completed sets for an exercise:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "page_size": 50,
  "results": [
    {
      "id": 1985393,
      "name": "Workout 2",
      "completed_at": "2026-02-22T19:01:16.662444-05:00",
      "notes": "",
      "sets": [
        {
          "workout_exercise_id": 18979176,
          "set_index": 2,
          "status": "complete",
          "metadata": [
            {"type": "weight", "value": "100", "units": "kg"},
            {"type": "reps", "value": "8"},
            {"type": "rir", "value": "2"}
          ]
        }
      ],
      "videos": []
    }
  ],
  "exercise": {
    "id": 338138,
    "name": "Back Squat",
    "type": "simple",
    "has_history": true
  },
  "max_lift": {
    "id": 752227,
    "exercise_id": 338138,
    "created": "2026-02-22T19:01:16.662261-05:00",
    "weight": 100,
    "units": "kg"
  }
}
```

Note: history set metadata omits `"type": "sets"` — only includes weight/reps/rir.

### GET /api/programming/client/exercise-history/{id}/best-performance?creator_id={id}

Best performance per rep count:

```json
[
  {"reps": 7, "weight": 100.0, "rir": 1.0, "units": "kg"},
  {"reps": 8, "weight": 100.0, "rir": 2.0, "units": "kg"}
]
```

### GET /api/programming/client/exercise-history/{id}/estimates?creator_id={id}

Predicted 1RM through 10RM based on best performances:

```json
[
  {"reps": 1, "predicted": 124.14, "units": "kg"},
  {"reps": 5, "predicted": 110.34, "units": "kg"},
  {"reps": 8, "predicted": 100.0, "units": "kg"}
]
```

### GET /api/programming/client/exercise-history/{id}/max-lifts?creator_id={id}

PR records with timestamps:

```json
[
  {"id": 1985393, "completed_at": "2026-02-22T19:01:16...", "value": 100.0, "units": "kg"}
]
```

### GET /api/programming/client/exercise-history/{id}/previous?creator_id={id}

Previous set data for pre-populating the workout form. Returns `[]` if no history.

### GET /api/programming/client/max-lift-defaults?exercise_id={id}

PR reference values for an exercise (used to pre-populate forms).

---

## Metadata Types

All set data uses a flexible metadata array with these observed types:

| Type | Description | Example Values | Notes |
|------|-------------|----------------|-------|
| `sets` | Set number | `"1"`, `"2"`, `"3"` | String, 1-based |
| `reps` | Rep count or range | `"8"`, `"6-8"`, `"12-15"` | Can be range |
| `weight` | Weight lifted | `"100"`, `""` | Has `"units": "kg"` field |
| `rest` | Rest period | `"90s"`, `"2-3m"` | Free-form string |
| `rir` | Reps in Reserve | `"2"`, `"1"` | String |
| `notes` | Per-exercise notes | free text | |

---

## Other Endpoints (Captured)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/activity/events` | GET | Activity feed (`event[]=program.workout.completed`) |
| `/api/activity/events/unreviewed/count` | GET | Unread notification count |
| `/api/client/client-habits` | GET | Habit tracking |
| `/api/client/forms` | GET | Coach check-in forms |
| `/api/client/metric/weight` | GET/POST | Body weight log |
| `/api/client/metric-series/weight` | GET | Body weight history chart |
| `/api/client/sessions` | GET | 1-on-1 coaching sessions |
| `/api/client/session-packages` | GET | Session packages |
| `/api/client/payment-methods` | GET | Stripe payment methods |
| `/api/nutrition/client/settings/status` | GET | Nutrition module status |
| `/api/nutrition/client/days/{YYYY-MM-DD}` | GET | Daily nutrition log |
| `/api/products/client/products` | GET | Available products |

## Endpoints from Static Analysis (Not Captured)

These were found via Hermes bytecode decompilation but not observed in MITM traffic:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/logout-token` | POST | Logout |
| `/api/auth/access-codes/lookup` | GET | Verify access code |
| `/api/auth/access-codes/set-password` | POST | Set password |
| `/api/users/me/billing` | GET | Billing info |
| `/api/users/me/charges` | GET | Payment charges |
| `/api/users/me/pricing` | GET | Pricing config |
| `/api/users/me/stats` | GET | User statistics |
| `/api/coach/clients` | GET | Coach's client list |
| `/api/coach/team-members` | GET | Team members |
| `/api/programming/coach/programs/` | GET | Coach programs |
| `/api/programming/coach/workouts` | GET/POST | Coach workout management |
| `/api/programming/coach/workouts/{id}` | GET/PUT | Coach workout detail |
| `/api/programming/client/max-lifts` | GET/POST | Manual PR entry |
| `/api/chat/token` | GET | Stream.io chat token |
| `/api/chat/join_channel` | POST | Join chat channel |
| `/api/notifications/tokens` | POST | Register push token |
| `/api/s3direct/get_presigned_url/` | GET | S3 upload URL |

---

## TrainHeroic → Superset Import Strategy

### Goal

Import historical workout data from TrainHeroic export into Superset.

### Prerequisites

- Superset account enrolled in a coach program with template workouts
- TrainHeroic export JSON (`trainheroic-export.json`)
- Exercise mapping file (`exercise-mapping.json`)

### Exercise Mapping

136 TrainHeroic exercises mapped to 1,299 Superset exercises:

| Category | Count |
|----------|-------|
| Exact matches | 33 |
| Manual corrections | 31 |
| High-confidence fuzzy | 20 |
| Needs review (flagged) | 24 |
| No match (English) | 8 |
| No match (Hebrew) | 20 |

Mapping stored in `exercise-mapping.json` with fields:
- `trainheroic_name` — original exercise name
- `superset_id` — matched Superset exercise ID (or `null`)
- `superset_name` — matched Superset exercise name (or `null`)
- `match_type` — `"exact"`, `"manual"`, `"fuzzy"`, or `"none"`
- `confidence` — match confidence (0.0 to 1.0)
- `review` — `true` if needs human review
- `review_reason` — why it was flagged

### Import Workflow

```
1. Login
   POST /api/auth/login-token → auth_token

2. Get program and template workouts
   GET /api/programming/client/programs → program_id
   GET /api/programming/client/workouts?program_id={id}&type[]=client → template workouts

3. For each TrainHeroic workout to import:
   a. Pick a template workout (any client-type workout)
   b. GET /api/programming/client/workouts/{template_id} → full workout with workout_exercise_ids
   c. Build completion payload:
      - Map TH exercises to Superset exercises via exercise-mapping.json
      - Use "replacements" array to swap exercises to match TH data
      - Build "sets" array with weight/reps/rir metadata
   d. POST /api/programming/client/workouts/{template_id}/complete
      → creates new completion record
   e. For subsequent imports on same template:
      POST /complete on the previous completion_id (repeat workflow)

4. Optional: edit completion timestamps
   PUT /api/programming/client/workouts/{completion_id}/edit-completed
   → can set completed_at to historical date (unverified)
```

### Challenges

1. **Template workouts required** — Cannot create workouts via client API; need coach endpoints or pre-existing templates
2. **Exercise ID mapping** — 24 fuzzy matches need manual review, 28 exercises have no match
3. **Historical dates** — Unknown if `completed_at` can be backdated via POST/PUT
4. **No batch endpoint** — Each workout must be completed individually
5. **Weight units** — TrainHeroic uses lb by default; Superset uses kg; need conversion

---

## Comparison: TrainHeroic vs Superset

| Feature | TrainHeroic | Superset |
|---------|-------------|----------|
| **Framework** | React Native + Expo | React Native + Expo SDK 52 |
| **Auth** | `session-token: <hex>` | `Authorization: Token <hex>` |
| **Base URL** | `https://api.trainheroic.com` | `https://www.supersetapp.com/api` |
| **Workout Structure** | Program → Workout → Block → SetExercise | Program → Workout → Exercise → Sets |
| **Set Data** | `param_1_type` enum (0-19) | `metadata[].type` string (`sets`, `reps`, `weight`, etc.) |
| **RPE Support** | Yes | Yes |
| **RIR Support** | No | Yes |
| **Circuits** | Block-level (`is_redzone`) | Exercise-level (`circuit_id`) |
| **Completion** | PATCH workout with results | POST `/complete` creates new record |
| **Chat** | Built-in | Stream.io |
| **Payments** | In-app purchases | Stripe |
| **PR Tracking** | `/exercises/{id}/history` | `/exercise-history/{id}/max-lifts` |
| **Videos** | Self-hosted | YouTube embeds |

---

## Third-Party Services

| Service | Purpose | Detail |
|---------|---------|--------|
| Stream.io | Chat/messaging | GetStream API |
| Stripe | Payments | Stripe publishable key |
| Sentry | Error tracking | `o321970.ingest.sentry.io` |
| ImageKit | Image CDN | `https://i.sprst.com/` |
| YouTube | Exercise videos | Embedded via `embed_video` field |
| Expo Updates | OTA updates | `https://u.expo.dev/1637b7b7-cc1b-4ef6-b47b-dce5e6eb8da8` |

---

## Files

| File | Description |
|------|-------------|
| `superset-api-capture.jsonl` | Raw MITM capture (JSONL, ~200 entries) |
| `exercise-mapping.json` | TrainHeroic → Superset exercise name mapping |
| `/tmp/superset_exercises.json` | Full Superset exercise library (1,299 exercises) |
| `/tmp/superset_json_capture.py` | Mitmproxy addon for JSON capture |
| `/tmp/superset_unified.js` | Frida SSL bypass script |
| `/tmp/fetch_superset_exercises.py` | Script to fetch all exercises via API |

---

## Appendix: MITM Capture Setup

### Frida SSL Bypass

Frida must run in **spawn mode** for SSL bypass to work:

```bash
frida -U -f com.supersetapp.android -l /tmp/superset_unified.js
```

The script (`superset_unified.js`) hooks OkHttp's SSL certificate validation to allow mitmproxy interception.

### Mitmproxy JSON Capture

```bash
mitmdump -p 8084 -s /tmp/superset_json_capture.py --set flow_detail=0
```

The addon (`superset_json_capture.py`) logs all `supersetapp.com` API calls as JSONL to `/tmp/superset_api_capture.jsonl`, filtering out `/external/log-proxy` noise. Captures method, URL, headers, request body, status, and response body.

### Android Proxy

Configure the emulator/device Wi-Fi proxy to point to the host machine's IP on port 8084. Install the mitmproxy CA certificate on the device.

### Known Issues with Patched APK

- Exercise history view crashes
- Video playback fails (SSL issues with YouTube/Vimeo embedded players)
- "Add set" button can crash the app
- Otherwise functional for API capture

---

## Legal Notice

This analysis was performed for personal data portability and educational purposes. Always respect terms of service and applicable laws when analyzing applications or interacting with third-party APIs.
