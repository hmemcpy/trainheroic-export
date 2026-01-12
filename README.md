# TrainHeroic Export Format

Version: 1.0

## Overview

This export format captures workout data from TrainHeroic for migration to other fitness tracking applications.

## Quick Start

```bash
# Set credentials
export TRAINHEROIC_EMAIL=your@email.com
export TRAINHEROIC_PASSWORD=yourpassword

# Full JSON export
python trainheroic-export.py -o my-export.json

# CSV export (multiple files)
python trainheroic-export.py --format csv -o ./export-data/

# Include personal records
python trainheroic-export.py --include-prs -o my-export.json

# Include exercise history
python trainheroic-export.py --include-history -o my-export.json

# Include full exercise catalog (single API call)
python trainheroic-export.py --include-catalog -o my-export.json

# Export EVERYTHING (PRs + history + catalog) - slowest but complete
python trainheroic-export.py --all -o my-export.json

# Incremental export (only new workouts since last run)
python trainheroic-export.py --incremental -o my-export.json
```

## Command Line Options

| Option | Description |
|--------|-------------|
| `-o, --output` | Output file (JSON) or directory (CSV) |
| `-f, --format` | Output format: `json` (default) or `csv` |
| `--include-prs` | Fetch personal records (1 API call per exercise) |
| `--include-history` | Fetch detailed exercise history |
| `--include-catalog` | Fetch full exercise catalog from user history |
| `--all` | Export everything: PRs + history + catalog (slowest) |
| `--incremental` | Only fetch new workouts since last export |
| `--start-date` | Start date for history (default: 2020-01-01) |
| `--end-date` | End date for history (default: 2030-12-31) |

## Output Formats

### JSON (default)

Single file with full structure:

```
trainheroic-export.json
├── version          # Schema version (1.0)
├── exported_at      # ISO 8601 timestamp
├── user             # User profile
├── profile_stats    # Aggregate statistics
├── workouts[]       # Array of workouts
├── exercises[]      # Exercise library (extracted from workouts)
├── personal_records[] # PRs by exercise (if --include-prs)
├── exercise_history[] # Detailed history (if --include-history)
└── exercise_catalog[] # Full exercise catalog (if --include-catalog)
```

### CSV

Multiple files in output directory:

```
export-data/
├── workouts.csv          # One row per workout (summary)
├── sets.csv              # One row per set (detailed, flattened)
├── exercises.csv         # Exercise library (extracted from workouts)
├── personal_records.csv  # PRs (if --include-prs or --all)
├── exercise_history.csv  # History (if --include-history or --all)
├── exercise_catalog.csv  # Full catalog (if --include-catalog or --all)
└── .trainheroic-export-state.json  # State for incremental exports
```

**sets.csv columns:**
- `workout_id`, `workout_date`, `workout_title`, `program`
- `workout_completed`, `workout_started_at`, `workout_completed_at`
- `block_title`, `block_order`
- `exercise_id`, `exercise_title`, `exercise_order`, `video_url`
- `set_number`, `set_completed`
- `prescribed_reps`, `prescribed_weight_kg`, `prescribed_duration_sec`
- `actual_reps`, `actual_weight_kg`, `actual_duration_sec`

## Incremental Export

The `--incremental` flag enables incremental exports:

1. First run: exports all workouts, saves state
2. Subsequent runs: only fetches workouts after the last exported date
3. For JSON: merges new workouts into existing file
4. For CSV: overwrites files with all data (state still tracked)

State is stored in `.trainheroic-export-state.json`:
```json
{
  "last_export_date": "2026-01-11",
  "last_export_at": "2026-01-11T22:00:00Z",
  "workout_count": 153
}
```

## Data Hierarchy

```
Workout
├── date, title, program
├── completed, completion_percent
├── started_at, completed_at
├── notes, rpe
└── blocks[]
    ├── title, instruction
    └── exercises[]
        ├── exercise_id, title
        ├── instruction, video_url
        ├── notes
        └── sets[]
            ├── set_number
            ├── prescribed (reps, weight, time)
            └── actual (what was logged)
```

## Field Reference

### Workout

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique workout instance ID |
| `date` | string | Scheduled date (YYYY-MM-DD) |
| `title` | string | Workout title |
| `program` | string | Program/team name |
| `completed` | boolean | Whether workout was marked complete |
| `completion_percent` | number | 0-1 completion percentage |
| `started_at` | datetime | When workout was started |
| `completed_at` | datetime | When workout was completed |
| `notes` | string | User notes for entire workout |
| `rpe` | number | Rate of Perceived Exertion (1-10) |
| `blocks` | array | Workout sections/blocks |

### Workout Block

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Block title (e.g., "Warm-up", "Strength") |
| `instruction` | string | Coach instructions for block |
| `order` | integer | Display order |
| `completed` | boolean | Block completion status |
| `exercises` | array | Exercises in this block |

### Logged Exercise

| Field | Type | Description |
|-------|------|-------------|
| `exercise_id` | integer | Reference to exercise library |
| `title` | string | Exercise name |
| `instruction` | string | Coach instructions |
| `video_url` | string | Demo video URL |
| `notes` | string | User notes for this exercise |
| `sets` | array | Individual sets |

### Set

| Field | Type | Description |
|-------|------|-------------|
| `set_number` | integer | Set number (1-indexed) |
| `prescribed` | SetData | What coach prescribed |
| `actual` | SetData | What athlete logged |
| `completed` | boolean | Whether set was completed |

### SetData (prescribed/actual)

| Field | Type | Description |
|-------|------|-------------|
| `reps` | integer | Number of repetitions |
| `weight_kg` | number | Weight in kilograms |
| `weight_lb` | number | Weight in pounds |
| `duration_seconds` | integer | Duration for timed exercises |
| `distance_meters` | number | Distance for cardio |
| `rpe` | number | Rate of Perceived Exertion |
| `percentage` | number | % of 1RM if prescribed |

### Personal Record

| Field | Type | Description |
|-------|------|-------------|
| `exercise_id` | integer | Exercise ID |
| `exercise_title` | string | Exercise name |
| `estimated_1rm_kg` | number | Calculated 1RM |
| `records` | array | PRs by rep count |
| `records[].reps` | integer | Rep count for this PR |
| `records[].weight_kg` | number | Weight lifted |
| `records[].date` | string | Date achieved |

## Units

- **Weight**: Stored in both `kg` and `lb` when available
- **Time**: Stored in seconds as `duration_seconds`
- **Distance**: Stored in meters as `distance_meters`

## Example

```json
{
  "version": "1.0",
  "exported_at": "2026-01-11T22:00:00Z",
  "user": {
    "id": 1364748,
    "name": "Igal Tabachnik",
    "use_metric": true
  },
  "profile_stats": {
    "total_sessions": 500,
    "total_reps": 45000,
    "total_volume_kg": 1250000
  },
  "workouts": [
    {
      "id": 288528173,
      "date": "2025-07-03",
      "title": "Strength Day",
      "program": "Powerlifting",
      "completed": true,
      "completion_percent": 1.0,
      "blocks": [
        {
          "title": "Strength/Power",
          "exercises": [
            {
              "exercise_id": 1310241,
              "title": "CONVENTIONAL DEADLIFT",
              "video_url": "https://youtube.com/watch?v=...",
              "sets": [
                {
                  "set_number": 1,
                  "prescribed": {"reps": 5, "weight_kg": 140},
                  "actual": {"reps": 5, "weight_kg": 140},
                  "completed": true
                },
                {
                  "set_number": 2,
                  "prescribed": {"reps": 4, "weight_kg": 140},
                  "actual": {"reps": 4, "weight_kg": 140},
                  "completed": true
                }
              ]
            }
          ]
        }
      ]
    }
  ],
  "personal_records": [
    {
      "exercise_id": 1310241,
      "exercise_title": "CONVENTIONAL DEADLIFT",
      "estimated_1rm_kg": 180,
      "records": [
        {"reps": 1, "weight_kg": 170, "date": "2025-06-15"},
        {"reps": 3, "weight_kg": 155, "date": "2025-05-20"},
        {"reps": 5, "weight_kg": 140, "date": "2025-07-03"}
      ]
    }
  ]
}
```

## Limitations

1. **Program-scoped data**: Only workouts from the current program are exportable via API
2. **Aggregate stats preserved**: Total sessions/reps/volume includes all programs
3. **No historical program details**: Detailed workout history from previous programs is not accessible

## Schema Validation

The export file can be validated against `schema.json` using any JSON Schema validator:

```bash
# Using ajv-cli
npx ajv validate -s schema.json -d trainheroic-export.json

# Using Python jsonschema
python -c "
import json
from jsonschema import validate
schema = json.load(open('schema.json'))
data = json.load(open('trainheroic-export.json'))
validate(data, schema)
print('Valid!')
"
```

## For LLM Consumption

When processing this export:

1. **Identify exercises** by `exercise_id` - same ID = same exercise across workouts
2. **Compare prescribed vs actual** to analyze adherence
3. **Track progression** by sorting workouts by date and comparing weights/reps
4. **Calculate volume** as `sets * reps * weight_kg` per exercise
5. **Use personal_records** for PR tracking and 1RM estimates
