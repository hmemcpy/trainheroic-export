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

#### Exercise Details (from frida capture)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/exercises/{id}/personalRecords` | GET | Personal records for exercise |
| `/v5/exercises/{id}/stackUp/isSupportedExercise` | GET | Check if exercise supports stack-up comparison |
| `/v5/exercises/{id}/stats` | GET | Exercise statistics |

#### Workout Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/3.0/athlete/programworkout/finish` | POST | Mark workout as finished |
| `/3.0/athlete/savedWorkout/futureSessions` | GET | Upcoming scheduled sessions |
| `/3.0/athlete/savedWorkout/futureSessionsToReschedule?dateRescheduled={date}` | GET | Sessions to reschedule |
| `/3.0/athlete/savedworkout/hasBeenLogged` | GET | Check if workout has been logged |
| `/v5/programWorkouts/personalRecords` | GET | Personal records across program workouts |
| `/v5/programWorkouts/publish` | POST | Publish program workouts (coach) |
| `/v5/workoutCombos` | GET | Workout combinations |
| `/v5/workoutSetExercises` | GET | Workout set exercise details |
| `/v5/workoutSets` | GET | Workout set details |
| `/v5/workoutStats/trainingLoad` | GET | Training load statistics |
| `/v5/workouts` | GET | Workouts |
| `/v5/savedWorkoutSetExercises` | GET | Saved workout set exercise details |

#### Personal Calendar
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/personalCalendar/programAndLog` | GET | Personal calendar program and log combined |
| `/v5/personalCalendar/workoutSetExercises` | GET | Calendar workout set exercises |
| `/v5/personalCalendar/workoutSets` | GET | Calendar workout sets |
| `/v5/personalCalendar/workouts` | GET | Calendar workouts |
| `/1.0/athlete/programming/updatePersonalCalendar` | PUT | Update personal calendar |
| `/1.0/athlete/programming/removeProgramFromPersonalCalendar` | DELETE | Remove program from calendar |

#### Comments
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/1.0/athlete/savedworkoutset/comments/{id}` | GET/POST | Comments on a workout set |
| `/1.0/athlete/savedworkoutsetexercise/comments?lastCommentId={id}` | GET | Comments on exercise, paginated by last comment |

#### Streaks & Calendars
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/sessions/streaks/summary?tzName={tz}` | GET | Training streak data |
| `/v5/calendars/athletes/{id}/coachAthleteTeam` | GET | Coach/team calendar |
| `/v5/calendars/teams/year` | GET | Team year calendar |

#### Monitoring & Readiness
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/monitoring/trends/shortTerm` | GET | Short-term readiness trends |
| `/v5/monitoring/trends/longTermAverageStandardDeviation` | GET | Long-term readiness averages |

#### User Account
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/users/account/resetPasswordWithForm` | POST | Reset password with form |
| `/v5/users/account/verifyForgotPasswordSecret` | POST | Verify forgot password token |
| `/v5/users/createAthleteAccount` | POST | Create athlete account |
| `/v5/userAgreementTerms/agreeToTerms` | POST | Accept terms of service |
| `/v5/emails/validate` | GET | Validate email address |
| `/v5/userWorkingMaxes` | GET/PUT | User working maxes (bulk) |
| `/1.0/user/payment/code` | POST | Payment code redemption |
| `/1.0/user/username-new` | PUT | Update username |
| `/1.0/user/email-address` | PUT | Update email address |

#### Athlete Onboarding & Surveys
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/trackAthleteOnboardingPath` | POST | Track onboarding progress |
| `/v5/athleteTrialLicense` | GET/POST | Athlete trial license |
| `/1.0/athlete/survey/downgradeCode` | GET | Downgrade survey code |
| `/1.0/athlete/survey/question` | GET | Survey questions |

#### Notification Settings (detailed)
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/notifications/settings/getReset` | GET | Get reset notification settings |
| `/v5/notifications/settings/setReset` | PUT | Set reset notification settings |
| `/v5/notifications/settings/setAllEmail` | PUT | Toggle all email notifications |
| `/v5/notifications/settings/setAllPush` | PUT | Toggle all push notifications |
| `/v5/notifications/settings/setOnBoardingPush` | PUT | Set onboarding push notifications |
| `/v5/notifications/settings/setOnBoardingEmail` | PUT | Set onboarding email notifications |

#### Messaging
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/messaging/streams` | GET | Message streams/conversations |
| `/v5/messaging/streams/athletes` | GET | Athlete message streams |
| `/v5/messaging/streams/programWorkouts` | GET | Program workout message streams |

#### Features
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/features` | GET | Global feature flags |

#### Leaderboard
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/1.0/athlete/leaderboard/likeResult` | POST | Like a leaderboard result |
| `/3.0/athlete/leaderboard/{id}/feedItem` | GET | Leaderboard feed item |
| `/1.0/athlete/programming/circuitLeaderboard/filters?userId={id}` | GET | Circuit leaderboard filters |

#### Telemetry
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/telemetry/track` | POST | Analytics events |
| `/v5/telemetry/trackAccessCode` | POST | Track access code usage |

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

#### File Upload
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/1.0/utility/files?check=fileUploadGainz&type={type}` | POST | File upload (images, videos) |

---

### Coach Endpoints (requires coach-role session token)

**Note:** These endpoints were extracted from the APK's Hermes bytecode and jadx decompilation. They return `401 Unauthorized` with an athlete session token. The app uses the same APK for both athlete and coach roles, with UI gated by the user's role.

#### Coach Teams & Athletes
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/1.0/coach/teams` | GET | List all teams the coach manages |
| `/1.0/coach/team/create` | POST | Create a new team |
| `/v5/coaches/activity/athletes` | GET | Activity feed for all athletes |
| `/v5/coaches/activity/newAthletes` | GET | Recently joined athletes |
| `/v5/coaches/activity/teams` | GET | Activity feed across teams |
| `/v5/coaches/org` | GET | Coach organization info |
| `/v5/headCoach` | GET | Head coach info |
| `/v5/athletes/inviteToTeam` | POST | Invite athlete to a team |
| `/v5/athletes/inviteToOrg` | POST | Invite athlete to organization |
| `/v5/teamAccess/code` | GET/POST | Team access via code |
| `/v5/teamAccess/email` | GET/POST | Team access via email |
| `/v5/calendars/teams/year` | GET | Team year calendar overview |

#### Coach Workout Management
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/3.0/coach/athlete/programworkout/range` | GET | View athlete's workout schedule (coach perspective) |
| `/1.0/coach/savedworkout/dashboard/header/addExercisesToProgramWorkout` | POST | Add exercises to a program workout |
| `/1.0/coach/savedworkoutset/disable` | PUT | Disable a workout set |
| `/1.0/coach/savedworkoutsetexercise/duplicate` | POST | Duplicate an exercise in a workout |
| `/1.0/athlete/savedworkout/coachAthleteTeam` | GET | Saved workout data in coach/team context |

#### Coach Programming
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v5/lowProgramming/teams` | GET | Low-level programming across teams |
| `/v5/programWorkouts/publish` | POST | Publish program workouts to athletes |

#### Coach-Specific Redux Actions (from bytecode, indicating data flows)
| Action Name | Inferred Behavior |
|---|---|
| `coach_log_for_athlete` | Coach can log workouts on behalf of an athlete |
| `coach-athletes-list-load-athlete-summary-stats` | Bulk load summary stats for all athletes |
| `coach-teams-list-load-program-workoutset` | Load program workout sets across all teams |
| `coach-invites-list-load` | Load pending team invitations |
| `coach-team-context-set-count-initialize` | Initialize athlete count for team context |
| `coach_show_nutrition_on_calendar` | Toggle nutrition display on athlete calendar |
| `coach_create_exercise` | Coach creating custom exercises |
| `coach_publish` | Publishing programs/workouts |
| `coach_programming` | Programming interface data |

#### Inferred Coach Data Access Pattern

Based on the code structure:
1. **Coach lists their teams** via `/1.0/coach/teams`
2. **Team contains athlete roster** - team data includes athlete IDs and summary info
3. **Coach views individual athlete** via `/3.0/coach/athlete/programworkout/range` with an athlete ID parameter
4. **Bulk athlete stats** loaded via `coach-athletes-list-load-athlete-summary-stats` action
5. **No single "export all trainees" endpoint** - the coach fetches per-athlete or per-team

To fully map the coach API, inspect the unobfuscated web app at `https://app.trainheroic.com` (JavaScript source is readable in browser DevTools).

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

> **Deep technical analysis** (Hermes decompilation, OkHttp internals, frida instrumentation, service module mappings) has been moved to [APK-ANALYSIS.md](APK-ANALYSIS.md).

---

## Legal Notice

This analysis was performed for educational and research purposes only. Always respect terms of service and applicable laws when interacting with third-party APIs.
