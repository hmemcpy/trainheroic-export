#!/usr/bin/env python3
"""
TrainHeroic Data Export Tool

Exports workout data to JSON or CSV format for migration.

Usage:
    # With environment variables
    export TRAINHEROIC_EMAIL=your@email.com
    export TRAINHEROIC_PASSWORD=yourpassword
    python trainheroic-export.py

    # Or with existing session
    export TRAINHEROIC_SESSION=abc123...
    export TRAINHEROIC_USER_ID=1234567
    python trainheroic-export.py

    # Options
    python trainheroic-export.py --output my-export.json
    python trainheroic-export.py --format csv --output ./export-dir/
    python trainheroic-export.py --include-prs
    python trainheroic-export.py --include-catalog  # Full exercise catalog
    python trainheroic-export.py --incremental  # Only fetch new workouts
    python trainheroic-export.py --all          # Export everything (slow)
"""

import csv
import json
import os
import sys
import argparse
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from pathlib import Path

API_BASE = "https://api.trainheroic.com"
APP_VERSION = "8.8.0"
STATE_FILE = ".trainheroic-export-state.json"


def progress_bar(current, total, prefix="", width=40):
    """Display a progress bar."""
    percent = current / total if total > 0 else 1
    filled = int(width * percent)
    bar = "█" * filled + "░" * (width - filled)
    print(f"\r{prefix} [{bar}] {current}/{total} ({percent*100:.0f}%)", end="", file=sys.stderr)
    if current >= total:
        print(file=sys.stderr)  # Newline when complete


# Param type mapping from TrainHeroic
PARAM_TYPES = {
    1: "weight",      # kg or lb
    3: "reps",        # repetitions
    4: "time_mmss",   # duration as MM:SS
    6: "sets_only",   # no params (measurements, etc.)
    18: "time_sec",   # duration in seconds
    19: "weight_any", # weight not prescribed (athlete chooses)
}


def api_request(endpoint, session_token, method="GET", data=None):
    """Make authenticated API request."""
    url = f"{API_BASE}{endpoint}"
    headers = {
        "session-token": session_token,
        "x-mobile-app-version": APP_VERSION,
        "Content-Type": "application/json",
    }

    req = Request(url, headers=headers, method=method)
    if data:
        req.data = json.dumps(data).encode()

    try:
        with urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode())
    except HTTPError as e:
        print(f"API Error: {e.code} - {e.read().decode()}", file=sys.stderr)
        raise


def login(email, password):
    """Login and return session token and user ID."""
    url = f"{API_BASE}/auth"
    headers = {"Content-Type": "application/json"}
    data = json.dumps({"email": email, "password": password}).encode()

    req = Request(url, headers=headers, data=data, method="POST")

    with urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode())

    return result["session_id"], result["id"]


def parse_time(time_str):
    """Parse time string to seconds. Handles MM:SS and raw seconds."""
    if not time_str:
        return None
    if ":" in str(time_str):
        parts = str(time_str).split(":")
        return int(parts[0]) * 60 + int(parts[1])
    try:
        return int(float(time_str))
    except:
        return None


def parse_set_data(exercise_data, set_index, param_1_type, param_2_type, is_prescribed=True):
    """Extract set data from exercise params."""
    p1_key = f"param_1_data_{set_index}"
    p2_key = f"param_2_data_{set_index}"

    p1_val = exercise_data.get(p1_key, "")
    p2_val = exercise_data.get(p2_key, "")

    result = {}

    # Parse param 1
    p1_type = PARAM_TYPES.get(param_1_type, "unknown")
    if p1_val and p1_val != "0":
        if p1_type == "reps":
            try:
                result["reps"] = int(float(p1_val))
            except:
                pass
        elif p1_type == "weight":
            try:
                result["weight_kg"] = float(p1_val)
            except:
                pass
        elif p1_type in ("time_mmss", "time_sec"):
            secs = parse_time(p1_val)
            if secs:
                result["duration_seconds"] = secs

    # Parse param 2
    p2_type = PARAM_TYPES.get(param_2_type, "unknown")
    if p2_val and p2_val != "0":
        if p2_type == "reps":
            try:
                result["reps"] = int(float(p2_val))
            except:
                pass
        elif p2_type == "weight":
            try:
                result["weight_kg"] = float(p2_val)
            except:
                pass
        elif p2_type in ("time_mmss", "time_sec"):
            secs = parse_time(p2_val)
            if secs:
                result["duration_seconds"] = secs

    return result if result else None


def transform_workout(raw_workout):
    """Transform raw API workout to export format."""
    ssw = raw_workout.get("summarizedSavedWorkout", {})
    saved = ssw.get("saved_workout", {})
    workout_template = ssw.get("workout", {})

    # Basic workout info
    workout = {
        "id": saved.get("id") or raw_workout.get("id"),
        "date": raw_workout.get("date"),
        "title": raw_workout.get("workout_title") or saved.get("title", ""),
        "program": raw_workout.get("program_title", ""),
        "completed": saved.get("completed", 0) == 1,
        "completion_percent": saved.get("percent_completed", 0),
    }

    # Timestamps
    if saved.get("timestamp_started"):
        workout["started_at"] = datetime.fromtimestamp(
            saved["timestamp_started"]
        ).isoformat()
    if saved.get("timestamp_completed"):
        workout["completed_at"] = datetime.fromtimestamp(
            saved["timestamp_completed"]
        ).isoformat()

    # Notes and RPE
    if saved.get("notes"):
        workout["notes"] = saved["notes"]
    if saved.get("rpe"):
        workout["rpe"] = float(saved["rpe"])

    # Transform blocks (workout sets)
    blocks = []
    saved_sets = {ws["workout_set_id"]: ws for ws in saved.get("workoutSets", [])}

    for ws in workout_template.get("workoutSets", []):
        saved_set = saved_sets.get(ws["id"], {})

        block = {
            "id": ws.get("id"),
            "title": ws.get("block_title") or ws.get("title", ""),
            "order": ws.get("order", 0),
            "completed": saved_set.get("completed", 0) == 1,
        }

        if ws.get("instruction"):
            block["instruction"] = ws["instruction"]

        # Transform exercises
        exercises = []
        saved_exercises = {
            ex["workout_set_exercise_id"]: ex
            for ex in saved_set.get("workoutSetExercises", [])
        }

        for ex_template in ws.get("exercises", []):
            saved_ex = saved_exercises.get(ex_template["id"], {})

            exercise = {
                "exercise_id": ex_template.get("exercise_id"),
                "title": saved_ex.get("exercise_title") or ex_template.get("title", ""),
                "order": ex_template.get("order", 0),
            }

            if ex_template.get("video_url"):
                exercise["video_url"] = ex_template["video_url"]
            if saved_ex.get("instruction") or ex_template.get("instruction"):
                exercise["instruction"] = saved_ex.get("instruction") or ex_template.get("instruction")
            if saved_ex.get("notes"):
                exercise["notes"] = saved_ex["notes"]

            # Extract sets
            param_count = ex_template.get("param_count", 0) or saved_ex.get("param_count", 0)
            param_1_type = ex_template.get("param_1_type") or saved_ex.get("param_1_type")
            param_2_type = ex_template.get("param_2_type") or saved_ex.get("param_2_type")

            sets = []
            for i in range(1, param_count + 1):
                prescribed = parse_set_data(ex_template, i, param_1_type, param_2_type, True)
                actual = parse_set_data(saved_ex, i, param_1_type, param_2_type, False)

                if prescribed or actual:
                    set_data = {"set_number": i}
                    if prescribed:
                        set_data["prescribed"] = prescribed
                    if actual:
                        set_data["actual"] = actual
                        set_data["completed"] = True
                    else:
                        set_data["completed"] = False
                    sets.append(set_data)

            if sets:
                exercise["sets"] = sets

            exercises.append(exercise)

        if exercises:
            block["exercises"] = exercises
            blocks.append(block)

    if blocks:
        workout["blocks"] = blocks

    return workout


def extract_exercises(workouts):
    """Extract unique exercises from workouts."""
    exercises = {}

    for workout in workouts:
        for block in workout.get("blocks", []):
            for ex in block.get("exercises", []):
                ex_id = ex.get("exercise_id")
                if ex_id and ex_id not in exercises:
                    exercises[ex_id] = {
                        "id": ex_id,
                        "title": ex.get("title", ""),
                    }
                    if ex.get("video_url"):
                        exercises[ex_id]["video_url"] = ex["video_url"]

    return list(exercises.values())


def fetch_personal_records(session_token, user_id, exercise_ids):
    """Fetch PRs for given exercises. One API call per exercise."""
    records = []
    total = len(exercise_ids)

    for i, ex_id in enumerate(exercise_ids):
        progress_bar(i + 1, total, prefix="  PRs")
        try:
            data = api_request(
                f"/v5/exercises/{ex_id}/history?userId={user_id}",
                session_token
            )

            pr_entry = {
                "exercise_id": ex_id,
                "exercise_title": data.get("title", ""),
            }

            if data.get("bestEstimated1RM"):
                pr_entry["estimated_1rm_kg"] = data["bestEstimated1RM"]

            prs = []
            for pr in data.get("liftPRs", []):
                if pr.get("weight"):
                    prs.append({
                        "reps": pr.get("reps", 1),
                        "weight_kg": pr["weight"],
                        "date": pr.get("date", ""),
                    })

            if prs:
                pr_entry["records"] = prs
                records.append(pr_entry)

        except Exception as e:
            print(f"\n  Warning: Could not fetch PRs for exercise {ex_id}: {e}", file=sys.stderr)

    return records


def load_state(state_path):
    """Load export state from file."""
    if os.path.exists(state_path):
        with open(state_path) as f:
            return json.load(f)
    return {}


def save_state(state_path, state):
    """Save export state to file."""
    with open(state_path, "w") as f:
        json.dump(state, f, indent=2)


def load_existing_export(output_path):
    """Load existing JSON export for incremental merge."""
    if os.path.exists(output_path) and output_path.endswith(".json"):
        with open(output_path) as f:
            return json.load(f)
    return None


def merge_exports(existing, new_workouts, new_exercises):
    """Merge new workouts into existing export."""
    if not existing:
        return None

    # Get existing workout IDs
    existing_ids = {w["id"] for w in existing.get("workouts", [])}

    # Add only new workouts
    added = 0
    for workout in new_workouts:
        if workout["id"] not in existing_ids:
            existing["workouts"].append(workout)
            added += 1

    # Sort by date
    existing["workouts"].sort(key=lambda w: w.get("date", ""))

    # Merge exercises
    existing_ex_ids = {e["id"] for e in existing.get("exercises", [])}
    for ex in new_exercises:
        if ex["id"] not in existing_ex_ids:
            existing["exercises"].append(ex)

    # Update timestamp
    existing["exported_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    return added


def flatten_to_csv_rows(workouts):
    """Flatten workouts to CSV rows (one row per set)."""
    rows = []

    for workout in workouts:
        workout_base = {
            "workout_id": workout.get("id"),
            "workout_date": workout.get("date"),
            "workout_title": workout.get("title"),
            "program": workout.get("program"),
            "workout_completed": workout.get("completed"),
            "workout_started_at": workout.get("started_at", ""),
            "workout_completed_at": workout.get("completed_at", ""),
            "workout_notes": workout.get("notes", ""),
            "workout_rpe": workout.get("rpe", ""),
        }

        for block in workout.get("blocks", []):
            block_base = {
                **workout_base,
                "block_title": block.get("title"),
                "block_order": block.get("order"),
            }

            for exercise in block.get("exercises", []):
                exercise_base = {
                    **block_base,
                    "exercise_id": exercise.get("exercise_id"),
                    "exercise_title": exercise.get("title"),
                    "exercise_order": exercise.get("order"),
                    "exercise_notes": exercise.get("notes", ""),
                    "video_url": exercise.get("video_url", ""),
                }

                sets = exercise.get("sets", [])
                if sets:
                    for s in sets:
                        prescribed = s.get("prescribed", {})
                        actual = s.get("actual", {})
                        row = {
                            **exercise_base,
                            "set_number": s.get("set_number"),
                            "set_completed": s.get("completed"),
                            "prescribed_reps": prescribed.get("reps", ""),
                            "prescribed_weight_kg": prescribed.get("weight_kg", ""),
                            "prescribed_duration_sec": prescribed.get("duration_seconds", ""),
                            "actual_reps": actual.get("reps", ""),
                            "actual_weight_kg": actual.get("weight_kg", ""),
                            "actual_duration_sec": actual.get("duration_seconds", ""),
                        }
                        rows.append(row)
                else:
                    # Exercise with no sets
                    rows.append({**exercise_base, "set_number": "", "set_completed": ""})

    return rows


def write_csv(output_dir, workouts, exercises, personal_records, exercise_history=None, exercise_catalog=None):
    """Write CSV files to output directory."""
    os.makedirs(output_dir, exist_ok=True)

    # Workouts (flattened to sets)
    sets_rows = flatten_to_csv_rows(workouts)
    if sets_rows:
        sets_path = os.path.join(output_dir, "sets.csv")
        fieldnames = list(sets_rows[0].keys())
        with open(sets_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(sets_rows)
        print(f"  Written: {sets_path} ({len(sets_rows)} rows)", file=sys.stderr)

    # Workouts summary (one row per workout)
    workouts_path = os.path.join(output_dir, "workouts.csv")
    workout_rows = []
    for w in workouts:
        total_sets = sum(
            len(ex.get("sets", []))
            for block in w.get("blocks", [])
            for ex in block.get("exercises", [])
        )
        completed_sets = sum(
            1 for block in w.get("blocks", [])
            for ex in block.get("exercises", [])
            for s in ex.get("sets", [])
            if s.get("completed")
        )
        workout_rows.append({
            "id": w.get("id"),
            "date": w.get("date"),
            "title": w.get("title"),
            "program": w.get("program"),
            "completed": w.get("completed"),
            "started_at": w.get("started_at", ""),
            "completed_at": w.get("completed_at", ""),
            "total_sets": total_sets,
            "completed_sets": completed_sets,
            "notes": w.get("notes", ""),
            "rpe": w.get("rpe", ""),
        })

    if workout_rows:
        with open(workouts_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=list(workout_rows[0].keys()))
            writer.writeheader()
            writer.writerows(workout_rows)
        print(f"  Written: {workouts_path} ({len(workout_rows)} rows)", file=sys.stderr)

    # Exercises
    if exercises:
        exercises_path = os.path.join(output_dir, "exercises.csv")
        with open(exercises_path, "w", newline="", encoding="utf-8") as f:
            fieldnames = ["id", "title", "video_url"]
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(exercises)
        print(f"  Written: {exercises_path} ({len(exercises)} rows)", file=sys.stderr)

    # Personal records
    if personal_records:
        prs_path = os.path.join(output_dir, "personal_records.csv")
        pr_rows = []
        for pr in personal_records:
            for record in pr.get("records", []):
                pr_rows.append({
                    "exercise_id": pr.get("exercise_id"),
                    "exercise_title": pr.get("exercise_title"),
                    "estimated_1rm_kg": pr.get("estimated_1rm_kg", ""),
                    "reps": record.get("reps"),
                    "weight_kg": record.get("weight_kg"),
                    "date": record.get("date"),
                })
        if pr_rows:
            with open(prs_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=list(pr_rows[0].keys()))
                writer.writeheader()
                writer.writerows(pr_rows)
            print(f"  Written: {prs_path} ({len(pr_rows)} rows)", file=sys.stderr)

    # Exercise history
    if exercise_history:
        history_path = os.path.join(output_dir, "exercise_history.csv")
        history_rows = []
        for ex in exercise_history:
            for h in ex.get("history", []):
                row = {
                    "exercise_id": ex.get("exercise_id"),
                    "exercise_title": ex.get("exercise_title"),
                    "date": h.get("date", ""),
                    "workout_title": h.get("workout_title", ""),
                    "sets": h.get("sets", ""),
                    "estimated_1rm": h.get("estimated_1rm", ""),
                }
                history_rows.append(row)
        if history_rows:
            with open(history_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=list(history_rows[0].keys()))
                writer.writeheader()
                writer.writerows(history_rows)
            print(f"  Written: {history_path} ({len(history_rows)} rows)", file=sys.stderr)

    # Exercise catalog
    if exercise_catalog:
        catalog_path = os.path.join(output_dir, "exercise_catalog.csv")
        fieldnames = ["id", "title", "video_url", "instruction", "param_1_type", "param_2_type"]
        with open(catalog_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(exercise_catalog)
        print(f"  Written: {catalog_path} ({len(exercise_catalog)} rows)", file=sys.stderr)


def fetch_exercise_history(session_token, user_id, exercise_ids):
    """Fetch detailed history for each exercise."""
    history = []
    total = len(exercise_ids)

    for i, ex_id in enumerate(exercise_ids):
        progress_bar(i + 1, total, prefix="  History")
        try:
            data = api_request(
                f"/v5/exercises/{ex_id}/history?userId={user_id}",
                session_token
            )

            if data.get("history"):
                history_entry = {
                    "exercise_id": ex_id,
                    "exercise_title": data.get("title", ""),
                    "history": []
                }

                for h in data.get("history", []):
                    entry = {
                        "date": h.get("date", ""),
                        "workout_title": h.get("workoutTitle", ""),
                    }
                    if h.get("sets"):
                        entry["sets"] = h["sets"]
                    if h.get("bestEstimated1RM"):
                        entry["estimated_1rm"] = h["bestEstimated1RM"]
                    history_entry["history"].append(entry)

                if history_entry["history"]:
                    history.append(history_entry)

        except Exception as e:
            print(f"\n  Warning: Could not fetch history for exercise {ex_id}: {e}", file=sys.stderr)

    return history


def fetch_exercise_catalog(session_token):
    """Fetch full exercise catalog from user's history."""
    try:
        data = api_request("/v5/users/exercises/history", session_token)

        exercises = []
        for ex in data if isinstance(data, list) else data.get("exercises", []):
            exercise = {
                "id": ex.get("id") or ex.get("exercise_id"),
                "title": ex.get("title") or ex.get("name", ""),
            }
            if ex.get("video_url"):
                exercise["video_url"] = ex["video_url"]
            if ex.get("videoUrl"):
                exercise["video_url"] = ex["videoUrl"]
            if ex.get("instruction"):
                exercise["instruction"] = ex["instruction"]
            if ex.get("param_1_type"):
                exercise["param_1_type"] = PARAM_TYPES.get(ex["param_1_type"], ex["param_1_type"])
            if ex.get("param_2_type"):
                exercise["param_2_type"] = PARAM_TYPES.get(ex["param_2_type"], ex["param_2_type"])
            exercises.append(exercise)

        return exercises
    except Exception as e:
        print(f"Warning: Could not fetch exercise catalog: {e}", file=sys.stderr)
        return []


def main():
    parser = argparse.ArgumentParser(description="Export TrainHeroic workout data")
    parser.add_argument("-o", "--output", default="trainheroic-export.json",
                        help="Output file (JSON) or directory (CSV)")
    parser.add_argument("-f", "--format", choices=["json", "csv"], default="json",
                        help="Output format (default: json)")
    parser.add_argument("--include-prs", action="store_true",
                        help="Fetch personal records (slower, one API call per exercise)")
    parser.add_argument("--include-history", action="store_true",
                        help="Fetch detailed exercise history")
    parser.add_argument("--include-catalog", action="store_true",
                        help="Fetch full exercise catalog from user history")
    parser.add_argument("--all", action="store_true",
                        help="Export everything: PRs, exercise history, catalog (slowest)")
    parser.add_argument("--start-date", default="2020-01-01",
                        help="Start date for workout history (YYYY-MM-DD)")
    parser.add_argument("--end-date", default="2030-12-31",
                        help="End date for workout history (YYYY-MM-DD)")
    parser.add_argument("--incremental", action="store_true",
                        help="Only fetch new workouts since last export")
    args = parser.parse_args()

    # --all implies all optional data
    if args.all:
        args.include_prs = True
        args.include_history = True
        args.include_catalog = True

    # Determine state file location
    if args.format == "csv":
        state_path = os.path.join(args.output, STATE_FILE)
    else:
        state_path = os.path.join(os.path.dirname(args.output) or ".", STATE_FILE)

    # Handle incremental export
    start_date = args.start_date
    existing_export = None

    if args.incremental:
        state = load_state(state_path)
        if state.get("last_export_date"):
            # Start from day after last export
            last_date = datetime.strptime(state["last_export_date"], "%Y-%m-%d")
            start_date = (last_date + timedelta(days=1)).strftime("%Y-%m-%d")
            print(f"Incremental mode: fetching from {start_date}", file=sys.stderr)

            # Load existing export for merging (JSON only)
            if args.format == "json":
                existing_export = load_existing_export(args.output)
                if existing_export:
                    print(f"Will merge with existing export ({len(existing_export.get('workouts', []))} workouts)",
                          file=sys.stderr)

    # Get credentials
    session = os.environ.get("TRAINHEROIC_SESSION")
    user_id = os.environ.get("TRAINHEROIC_USER_ID")

    if not session:
        email = os.environ.get("TRAINHEROIC_EMAIL")
        password = os.environ.get("TRAINHEROIC_PASSWORD")

        if not email or not password:
            print("Error: Set TRAINHEROIC_EMAIL and TRAINHEROIC_PASSWORD, or TRAINHEROIC_SESSION",
                  file=sys.stderr)
            sys.exit(1)

        print("Logging in...", file=sys.stderr)
        session, user_id = login(email, password)
        print(f"Logged in as user {user_id}", file=sys.stderr)

    user_id = int(user_id)

    # Fetch user profile
    print("Fetching user profile...", file=sys.stderr)
    user_data = api_request(f"/v5/users/{user_id}", session)

    user = {
        "id": user_id,
        "name": f"{user_data.get('name_first', '')} {user_data.get('name_last', '')}".strip(),
        "use_metric": user_data.get("use_metric", 1) == 1,
    }
    if user_data.get("email"):
        user["email"] = user_data["email"]

    # Fetch profile stats
    print("Fetching profile stats...", file=sys.stderr)
    stats_data = api_request(
        f"/v5/athleteProfile/summary?user_id={user_id}&use_metric=1",
        session
    )

    profile_stats = {
        "total_sessions": stats_data.get("totalSessions", 0),
        "total_reps": stats_data.get("totalReps", 0),
        "total_volume_kg": stats_data.get("totalVolume", 0),
        "total_exercises": stats_data.get("totalExercises", 0),
        "unique_exercises": stats_data.get("uniqueExercises", 0),
    }

    # Fetch workout history
    print(f"Fetching workouts ({start_date} to {args.end_date})...", file=sys.stderr)
    raw_workouts = api_request(
        f"/3.0/athlete/programworkout/range?startDate={start_date}&endDate={args.end_date}&preview=false",
        session
    )

    print(f"Processing {len(raw_workouts)} workouts...", file=sys.stderr)
    workouts = [transform_workout(w) for w in raw_workouts]

    # Extract exercise library
    exercises = extract_exercises(workouts)
    print(f"Found {len(exercises)} unique exercises", file=sys.stderr)

    # Optionally fetch PRs and history
    exercise_ids = [ex["id"] for ex in exercises if ex.get("id")]

    personal_records = []
    if args.include_prs and exercise_ids:
        print("Fetching personal records...", file=sys.stderr)
        personal_records = fetch_personal_records(session, user_id, exercise_ids)
        print(f"  Found PRs for {len(personal_records)} exercises", file=sys.stderr)

    exercise_history = []
    if args.include_history and exercise_ids:
        print("Fetching exercise history...", file=sys.stderr)
        exercise_history = fetch_exercise_history(session, user_id, exercise_ids)
        print(f"  Found history for {len(exercise_history)} exercises", file=sys.stderr)

    exercise_catalog = []
    if args.include_catalog:
        print("Fetching exercise catalog...", file=sys.stderr)
        exercise_catalog = fetch_exercise_catalog(session)
        print(f"  Found {len(exercise_catalog)} exercises in catalog", file=sys.stderr)

    # Handle incremental merge for JSON
    added_count = len(workouts)
    if existing_export and args.format == "json":
        added_count = merge_exports(existing_export, workouts, exercises)
        if added_count is not None:
            print(f"Merged {added_count} new workouts into existing export", file=sys.stderr)
            workouts = existing_export["workouts"]
            exercises = existing_export["exercises"]

    # Output
    if args.format == "csv":
        print(f"\nWriting CSV files to {args.output}/", file=sys.stderr)
        write_csv(args.output, workouts, exercises, personal_records, exercise_history, exercise_catalog)
    else:
        # Build JSON export
        export = existing_export if existing_export else {
            "version": "1.0",
            "exported_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "user": user,
            "profile_stats": profile_stats,
            "workouts": workouts,
            "exercises": exercises,
        }

        if not existing_export:
            if personal_records:
                export["personal_records"] = personal_records
            if exercise_history:
                export["exercise_history"] = exercise_history
            if exercise_catalog:
                export["exercise_catalog"] = exercise_catalog

        # Write output
        with open(args.output, "w") as f:
            json.dump(export, f, indent=2, ensure_ascii=False)

        print(f"\nExport complete: {args.output}", file=sys.stderr)

    # Update state for incremental exports
    if workouts:
        latest_date = max(w.get("date", "") for w in workouts)
        save_state(state_path, {
            "last_export_date": latest_date,
            "last_export_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "workout_count": len(workouts),
        })

    # Summary
    print(f"\nSummary:", file=sys.stderr)
    print(f"  - {len(workouts)} total workouts", file=sys.stderr)
    print(f"  - {len(exercises)} exercises", file=sys.stderr)
    if personal_records:
        print(f"  - {len(personal_records)} exercises with PRs", file=sys.stderr)
    if exercise_history:
        print(f"  - {len(exercise_history)} exercises with history", file=sys.stderr)
    if exercise_catalog:
        print(f"  - {len(exercise_catalog)} exercises in catalog", file=sys.stderr)

    completed = sum(1 for w in workouts if w.get("completed"))
    print(f"  - {completed} completed, {len(workouts) - completed} incomplete", file=sys.stderr)


if __name__ == "__main__":
    main()
