# TrainHeroic API Analysis

## Server URLs

| Environment | URL | Notes |
|-------------|-----|-------|
| **Production** | `https://api.trainheroic.com` | HTTPS enforced |
| Beta/Staging | `https://beta.trainheroic.com` | Testing environment |
| Development | `http://api.local.trainheroic.com:8888` | Local dev server |
| Static Assets | `https://static.trainheroic.com` | Videos, images |
| Legal/Terms | `https://legal.trainheroic.com` | Legal documents |
| Marketplace | `https://marketplace.trainheroic.com` | Coach marketplace |

---

## API Details

### Base URL
```
https://api.trainheroic.com/v5/
```

### Known Endpoints

#### Authentication
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth` | POST | Login with email/password, returns `session_id` |

#### User & Profile
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/users/{id}` | GET | User profile by ID |
| `/v5/users/createAthleteAccount` | POST | Account creation |
| `/v5/users/account/sendResetPasswordEmail` | POST | Password reset |
| `/v5/users/{id}/features` | GET | Feature flags for user |
| `/v5/users/features/hasSeen` | GET | Features user has seen |
| `/v5/parentGuardianConsent/shouldPromptForConsent` | GET | Minor consent check |
| `/user/mobile` | GET | Mobile user info |
| `/1.0/user/userInfo` | GET | Legacy user info |

#### Athlete Profile & Stats
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/athleteProfile/summary` | GET | All-time training stats (reps, volume, sessions) |
| `/v5/athleteProfile/summary/sessionCount` | GET | Recent N sessions summary |
| `/v5/athleteProfile/dateRange` | GET | Training stats for date range |
| `/v5/athletePro/access` | GET | Pro subscription status |

#### Workouts & Programming
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/3.0/athlete/programworkout/range` | GET | Workout schedule for date range |
| `/3.0/athlete/savedworkout/surveys` | GET | Workout surveys by IDs |
| `/v5/savedWorkouts/{id}/liftPersonalRecords` | GET | Personal records for a saved workout |
| `/3.0/athlete/leaderboard/{id}?page=1&pageSize=9999&gender=0` | GET | Leaderboard for workout/exercise |
| `/1.0/athlete/programming/programs` | GET | Enrolled programs |
| `/1.0/athlete/userlicense` | GET | User licenses/subscriptions |
| `/v5/programs/new` | GET | Available new programs |

#### Exercise History & Library
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/exercises/{exercise_id}` | GET | Exercise metadata (title, video, params) |
| `/v5/exercises/{exercise_id}/history?userId={user_id}` | GET | Detailed history with PRs and estimated 1RM |
| `/v5/exercises/{exercise_id}/relationalStats?userId={user_id}` | GET | Relational stats for exercise |
| `/3.0/athlete/exercise/{exercise_id}/history` | GET | Basic history for exercise |
| `/v5/users/{user_id}/workingMaxes/{exercise_id}` | GET | Working max for exercise |
| `/v5/users/exercises/recent` | GET | Recently used exercises |
| `/v5/users/exercises/history` | GET | Full exercise history list |
| `/v5/users/exercises?teamId={team_id}&userId={user_id}` | GET | All exercises available from team/coach |

#### Logging Workouts
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/1.0/athlete/savedworkoutsetexercise/{id}` | PUT | Log/update exercise set data (reps, weight) |
| `/1.0/athlete/savedworkoutset/{id}` | PUT | Update workout set completion |

#### Circuits
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/users/circuits/recent` | GET | Recently used circuits |
| `/v5/users/circuits/history` | GET | Full circuit history list |
| `/v5/users/circuits?teamId={team_id}&userId={user_id}` | GET | All circuits available from team/coach |

#### Library & Content Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/personalCalendar/sessions` | GET | Personal calendar sessions |
| `/v5/personalCalendar/sessions/templates` | GET | Session templates |
| `/v5/contentManager/sessions` | GET | Content manager sessions |

#### Marketplace & Programs
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/programs/free` | GET | Free programs list |
| `/v5/marketplace/iap/options?theme={theme}` | GET | In-app purchase options |

#### Notifications & Messaging
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/notifications` | GET | Full notifications list |
| `/v5/notifications/counts` | GET | Unread notification counts |
| `/v5/notifications/viewed` | PUT | Mark notifications as viewed |
| `/v5/notifications/read` | PUT | Mark all notifications as read |
| `/v5/notifications/settings` | GET/PUT | Notification preferences |
| `/v5/notifications/settings/getReset` | GET | Notification reset settings |
| `/v5/messaging/reactions` | GET | Available message reactions |

#### Streaks & Calendars
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/sessions/streaks/summary` | GET | Training streak data |
| `/v5/calendars/athletes/{id}/coachAthleteTeam` | GET | Coach/team calendar |

#### Telemetry
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/telemetry/track` | POST | Analytics events |

#### Push Tokens
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/userPushTokens` | POST/DELETE | Register/remove push notification tokens |

#### Session Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth` | POST | Login with email/password, returns session_id |
| `/v5/userPushTokens?onesignalPlayerId={id}` | DELETE | Logout (unregister push token, session cleared client-side) |

**Note:** There is no explicit session destroy endpoint. Logout consists of:
1. DELETE push token registration
2. Clear session token locally (subsequent requests get 401)

### Request Format

```http
GET /v5/users/me HTTP/1.1
Host: api.trainheroic.com
session-token: <session_token>
x-mobile-app-version: 8.8.0
Content-Type: application/json
```

### HTTP Headers (from traffic analysis)

**Request Headers:**
| Header | Value | Notes |
|--------|-------|-------|
| `User-Agent` | `okhttp/4.12.0` | OkHttp client |
| `Accept` | `application/json` | Standard JSON API |
| `Content-Type` | `application/json` | For POST/PUT requests |
| `Accept-Encoding` | `gzip` | Compression support |
| `session-token` | 32-char hex | Authentication token |
| `x-mobile-app-version` | `8.8.0` | App version |
| `if-modified-since` | RFC date | Caching support |

**Response Headers:**
| Header | Value | Notes |
|--------|-------|-------|
| `x-api-version` | `8.4` | API version |
| `server` | `Apache/2.4.62 (Amazon Linux)` | Server info |
| `cache-control` | `no-cache, private` | Caching policy |
| `access-control-allow-origin` | `*` | CORS - allows any origin |

**Rate Limiting:** No rate limit headers observed in responses (`X-RateLimit-*`, `Retry-After`, etc.). The API may have server-side rate limiting not exposed in headers.

---

## Authentication Flow

### Direct API Login

The TrainHeroic API has a direct login endpoint:

```bash
curl -X POST "https://api.trainheroic.com/auth" \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "yourpassword"}'
```

**Response:**
```json
{
  "id": 1364748,
  "api_token": "...",
  "refresh_token": "...",
  "api_ttl": 2025.33,
  "scope": "athlete",
  "role": "athlete",
  "session_id": "abc123..."  // <-- Use this as session-token!
}
```

**Use `session_id` for all subsequent requests:**
```bash
curl "https://api.trainheroic.com/v5/users/USER_ID" \
  -H "session-token: SESSION_ID" \
  -H "x-mobile-app-version: 8.8.0"
```

### Session Token Details

- **Format:** 32-character hex string
- **Header:** `session-token` (not Bearer JWT)
- **Lifespan:** Long-lived (~33 minutes reported in `api_ttl`, but generally works longer)
- **Refresh:** Use `refresh_token` from login response if needed

---

## API Usage Examples

### Fetch Workout Schedule

```bash
START_DATE="2026-01-11"
END_DATE="2026-01-17"

curl -s "https://api.trainheroic.com/3.0/athlete/programworkout/range?startDate=$START_DATE&endDate=$END_DATE&preview=false" \
  -H "session-token: $SESSION_TOKEN" \
  -H "x-mobile-app-version: 8.8.0"
```

**Query Parameters:**
- `startDate` / `endDate` - Date range in `YYYY-MM-DD` format
- `preview=false` - Whether to show unpublished workouts (coach feature)

**Fetching Full History:**
The API accepts wide date ranges - you can fetch your entire workout history in a single request:
```bash
curl -s "https://api.trainheroic.com/3.0/athlete/programworkout/range?startDate=2020-01-01&endDate=2030-12-31&preview=false" \
  -H "session-token: $SESSION_TOKEN" \
  -H "x-mobile-app-version: 8.8.0" \
  -o workout-history.json
```

**Important Limitation - Program Scoping:**
Workout data is scoped to your **currently active program only**. If you've switched programs:
- `/v5/athleteProfile/summary` shows aggregate stats across ALL programs (total sessions, reps, volume)
- `/3.0/athlete/programworkout/range` only returns workouts from your current program
- Exercise history endpoints also only show data from the current program
- Historical workout details from previous programs are not accessible via API

To see your program history:
```bash
curl -s "https://api.trainheroic.com/1.0/athlete/userlicense" \
  -H "session-token: $SESSION_TOKEN" \
  -H "x-mobile-app-version: 8.8.0"
```
This returns all teams/programs you've been enrolled in with start dates.

**Workout Completion Fields:**

The response includes completion status at multiple levels:

```json
"saved_workout": {
    "completed": 0,                    // 0 = incomplete, 1 = complete
    "date_completed": "1970-01-01 00:00:00",  // epoch = not done
    "status": 0,
    "percent_completed": 0,
    "timestamp_completed": null
}
```

For a completed workout:
```json
{
    "completed": 1,
    "date_completed": "2026-01-11 19:41:09",
    "workout_percent_completed": 0.5,
    "rx": 1                            // 1 = as prescribed
}
```

At the exercise/set level:
```json
{
    "completed": 1,
    "param_1_made": 1,                 // reps achieved
    "param_1_data_1": "5",             // actual value
    "param_1_data_1_prescribed": "5",  // prescribed value
    "notes": "..."                     // user comments
}
```

### Fetch Exercise History (Basic)

```bash
EXERCISE_ID="1310241"  # e.g., Conventional Deadlift

curl -s "https://api.trainheroic.com/3.0/athlete/exercise/$EXERCISE_ID/history" \
  -H "session-token: $SESSION_TOKEN" \
  -H "x-mobile-app-version: 8.8.0"
```

### Fetch Exercise History (Detailed with PRs)

```bash
EXERCISE_ID="4342392"
USER_ID="1364748"

curl -s "https://api.trainheroic.com/v5/exercises/$EXERCISE_ID/history?userId=$USER_ID" \
  -H "session-token: $SESSION_TOKEN" \
  -H "x-mobile-app-version: 8.8.0"
```

Response includes:
- `liftPRs` - Personal records by rep range (1RM, 2RM, 3RM, etc.)
- `history` - Workout history with sets, `bestEstimated1RM`, and formatted values

### Fetch Working Max

```bash
curl -s "https://api.trainheroic.com/v5/users/$USER_ID/workingMaxes/$EXERCISE_ID" \
  -H "session-token: $SESSION_TOKEN" \
  -H "x-mobile-app-version: 8.8.0"
```

### Fetch Team Exercises (Full Library)

```bash
TEAM_ID="2198364"
USER_ID="1364748"

curl -s "https://api.trainheroic.com/v5/users/exercises?teamId=$TEAM_ID&userId=$USER_ID" \
  -H "session-token: $SESSION_TOKEN" \
  -H "x-mobile-app-version: 8.8.0"
```

Returns all exercises available from your team/coach, including custom exercises with gym branding.

**Note:** Search within this list is done client-side by the app.

### Fetch Training Stats (by year)

```bash
curl -s "https://api.trainheroic.com/v5/athleteProfile/dateRange?user_id=USER_ID&use_metric=1&start_date=2024-01-01&end_date=2024-12-31" \
  -H "session-token: $SESSION_TOKEN" \
  -H "x-mobile-app-version: 8.8.0"
```

### Fetch All-Time Profile Summary

```bash
curl -s "https://api.trainheroic.com/v5/athleteProfile/summary?user_id=USER_ID&use_metric=1" \
  -H "session-token: $SESSION_TOKEN" \
  -H "x-mobile-app-version: 8.8.0"
```

---

## Data Export

For migrating workout data to another app:

- `schema.json` - JSON Schema for the export format
- `trainheroic-export.py` - Export script

```bash
export TRAINHEROIC_EMAIL=your@email.com
export TRAINHEROIC_PASSWORD=yourpassword

# Full JSON export
python trainheroic-export.py -o my-export.json

# CSV export (creates workouts.csv, sets.csv, exercises.csv)
python trainheroic-export.py --format csv -o ./export-data/

# Export EVERYTHING with progress bar (PRs + exercise history)
python trainheroic-export.py --all -o my-export.json

# Incremental export (only new workouts since last run)
python trainheroic-export.py --incremental -o my-export.json
```

---

## Summary

1. **Direct API login** - POST to `/auth` with email/password returns a session token
2. **Session token authentication** - Use `session-token` header (32-char hex, not Bearer JWT)
3. **Exercise search is client-side** - Team exercises pre-loaded from `/v5/users/exercises?teamId=...`
4. **Workout data includes full exercise details** - No separate exercise database download
5. **Session tokens are long-lived** - ~33 minutes reported TTL, but generally work longer
6. **Program-scoped data** - Workout history only accessible for current program

---

## Legal Notice

This analysis was performed for educational and research purposes only. Always respect terms of service and applicable laws when interacting with third-party APIs.
