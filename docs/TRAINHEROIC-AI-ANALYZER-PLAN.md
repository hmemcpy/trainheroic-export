# TrainHeroic AI Analyzer Plan

## Goal

TrainHeroic remains the source of truth. The webapp should periodically fetch completed workout data, detect meaningful changes, and use GLM-5.2 to propose reviewable programming adjustments.

## Sync Strategy

- Do not continuously poll.
- Sync on login or planner open only if the last sync is stale.
- On planned workout days, run a post-workout sync after the likely training window.
- If no completed workout is detected, run one fallback sync the next morning.
- Keep a manual "Sync now" action available.

Default schedule:

- Workout day: sync at 21:30 local time if no exact workout time is known.
- Morning after workout day: sync at 08:00 local time if the prior sync found no completed workout.
- No minute-level polling.

## API Usage

Use small date windows for normal sync:

- First import: full history.
- Normal sync: yesterday through the next 14-30 days.
- Manual full resync: explicit user action only.

Primary source:

- `GET /3.0/athlete/programworkout/range`

Optional lightweight hints:

- `GET /v5/notifications/counts`
- `GET /v5/notifications`
- Coach activity endpoints, if coach access exists.

No webhook endpoint is documented in the current TrainHeroic analysis.

## Analysis Pipeline

1. Fetch recent TrainHeroic workouts.
2. Normalize workouts into the app model.
3. Fingerprint completed workouts by date, completion state, set values, notes, and RPE.
4. Skip analysis if no completed workout changed.
5. Run deterministic metrics:
   - e1RM trend
   - missed/reduced targets
   - completion rate
   - volume trend
   - main lift exposure frequency
   - accessory compliance
6. Send compact facts and current plan context to GLM-5.2.
7. Return structured suggestions only.
8. Show suggestions for review before applying them to future unpublished sessions.

## GLM-5.2 Role

GLM-5.2 should reason over summarized facts, not raw TrainHeroic JSON. It should produce structured suggestions such as:

- increase or reduce next load
- repeat a week
- reduce optional accessory work
- swap a variation
- add backoff work
- flag recovery or compliance concerns

Suggestions should include a reason and confidence level. The app should never auto-write GLM suggestions into TrainHeroic without confirmation.

## Safety Defaults

- Single-flight sync lock.
- Minimum 10-minute cooldown for user-triggered refreshes unless forced.
- Scheduled syncs run once per slot.
- Stop polling on `401` or `403`.
- Back off on network errors or `503`.
- Treat any `429` as a hard backoff signal, even though no rate-limit headers were observed in the docs.
