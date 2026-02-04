# TrainHeroic APK Analysis

## Overview

| Property | Value |
|----------|-------|
| **Package** | `com.TrainHeroic.TrainHeroic` |
| **APK Size** | ~69MB |
| **Analysis Date** | January–February 2026 |

---

## Technology Stack

| Layer | Technology |
|---|---|
| UI Framework | **React Native + Expo** |
| JS Engine | **Hermes** (compiled bytecode, 19.6 MB bundle, HBC v96) |
| HTTP Client (JS) | **Axios** (file uploads) / **fetch()** (API calls) |
| Hot Updates | **CodePush** |
| HTTP Client (Native) | **OkHttp 4.12.0** (fully obfuscated by R8/ProGuard) |
| Bridge | `com.facebook.react.modules.network.NetworkingModule` |
| Push Notifications | OneSignal |
| Analytics | Segment (`ZxDMDPynKLxRK3RXkodOnxGJ98JntnBe`) |

Request flow: `authenticatedFetch (JS) → fetch() → XHR → NetworkingModule.sendRequest() → OkHttp enqueue()`

---

## Network Security Configuration

From `res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="false">localhost</domain>
        <domain includeSubdomains="false">10.0.2.2</domain>
        <domain includeSubdomains="false">10.0.3.2</domain>
    </domain-config>
</network-security-config>
```

- Cleartext (HTTP) only for development hosts
- `10.0.2.2` - Android Emulator localhost
- `10.0.3.2` - Genymotion localhost
- Production requires HTTPS

---

## API Environment Configuration

From decompiled Hermes bytecode (~line 357715):

```javascript
PROD_API = {
  symbol: null,
  api: 'https://api.trainheroic.com/',
  liveApi: 'https://live.trainheroic.com/',
  segmentKey: 'ZxDMDPynKLxRK3RXkodOnxGJ98JntnBe'
};

ALPHA_API = {
  symbol: 'α',
  api: 'https://api.alpha.trainheroic.com/',
  liveApi: 'https://live.alpha.trainheroic.com/',
  segmentKey: 'HIE7M0cZtYe3OqYoTAPYFUBO2Ctp17Ag'
};

STAGING_API = {
  symbol: 'β',
  api: 'https://api.staging.trainheroic.com/',
  liveApi: 'https://live.trainheroic.com/',
  segmentKey: 'ZxDMDPynKLxRK3RXkodOnxGJ98JntnBe'
};
```

The `api` URL from the active environment is set as `baseURL` on the Axios instance.

---

## Central Fetch Layer (API Client Module)

All API calls go through a single module exporting three functions (~line 332475):

| Export Name | Purpose | Auth |
|---|---|---|
| `authenticatedFetch(path, options?)` | Standard API calls | Yes - adds `Session-Token` + `X-Mobile-App-Version` |
| `authenticatedFileUpload(path, uri, type, onProgress?)` | File uploads via FormData + Axios | Yes |
| `unauthenticatedFetch(path, options?)` | Public endpoints (account creation, password reset) | No |

### `_authenticatedFetch` implementation (~line 331907):

```
function* _authenticatedFetch(url, options = {method: 'GET'}) {
    mergedOptions = Object.assign({}, options)
    if (!mergedOptions.headers) mergedOptions.headers = {}

    // Inject auth headers
    mergedOptions.headers['Session-Token'] = store.session_id
    mergedOptions.headers['X-Mobile-App-Version'] = DeviceInfo.getVersion()

    // Set Content-Type for non-GET
    if (options.method !== 'GET' && !mergedOptions.headers['Content-Type'])
        mergedOptions.headers['Content-Type'] = 'application/json'

    // Resolve full URL via urlFormatter (prepends baseURL)
    fullUrl = urlFormatter(url)

    // Execute via global fetch()
    response = yield fetch(fullUrl, mergedOptions)

    // Response handling:
    // 200 OK → dispatch CONNECTED to Redux store
    // 503 SERVICE_UNAVAILABLE → dispatch MAINTENANCE_MODE_ON, throw error
    // 403 FORBIDDEN → dispatch LOGOUT, navigate to Welcome screen
    return response
}
```

Key observations:
- Uses `fetch()` (not Axios directly) for standard API calls
- Axios is used only for file uploads (`authenticatedFileUpload` creates an Axios instance)
- The `urlFormatter` prepends the environment's `api` base URL
- All functions are generator-based (async via `redux-saga` `call()`)

### `authenticatedFileUpload` implementation (~line 332186):

```
function* authenticatedFileUpload(path, uri, type, onProgress?) {
    formData = new FormData()
    formData.append('file', {uri, type, name: 'file'})

    axiosInstance = axios.create({
        baseURL: config.api,
        headers: {'Session-Token': store.session_id}
    })

    return axiosInstance.post(path, formData, {onUploadProgress: ...})
}
```

---

## Service Modules & Their Endpoints

Each feature area has its own service module that calls `authenticatedFetch`. Below are the
modules with their functions and endpoints, traced from the decompiled bytecode:

### Coach Service (~line 441118, module 1258)

| Function Name | Endpoint | Method |
|---|---|---|
| `_getOrgAthletes` | `v5/athletes` | GET |
| `_getOrgInvites` | `v5/athletes/invites` | GET |
| `loadTeams` | `1.0/coach/teams` | GET |
| `_getProgramWorkoutForAthleteOverRange` | `3.0/coach/athlete/programworkout/range/{athleteId}?startDate=...&endDate=...&orgId=...` | GET |

### Coach Logging Service (~line 441680)

| Function Name | Endpoint | Method |
|---|---|---|
| `getSWUrl(athleteId, workoutId)` | `1.0/coach/savedworkout/{athleteId}/{workoutId}` | GET |
| `getSWSUrl(athleteId, setId)` | `1.0/coach/savedworkoutset/{athleteId}/{setId}` | GET |
| `getSWSEUrl(athleteId, exerciseId)` | `1.0/coach/savedworkoutsetexercise/{athleteId}/{exerciseId}` | GET |

### Coach Team Management (~line 1039737)

| Function Name | Endpoint | Method |
|---|---|---|
| (invite to org) | `/v5/athletes/inviteToOrg` | POST |
| (invite to team) | `/v5/athletes/inviteToTeam` | POST |
| (validate email) | `/v5/emails/validate` | GET |
| (create team) | `1.0/coach/team/createWithTitleAndCode` | POST |
| (coach orgs) | `v5/coaches/orgs` | GET |

### Coach Activity Service (~line 1230946)

| Function Name | Endpoint | Method |
|---|---|---|
| (team activity) | `v5/coaches/activity/teams/{teamId}` | GET |
| (athlete activity) | `v5/coaches/activity/athletes/{athleteId}` | GET |
| (new athletes) | `v5/coaches/activity/newAthletes/{orgId}` | GET |

### Athlete Workout Service (~line 443895, module 1266)

| Function Name | Endpoint | Method |
|---|---|---|
| `getSavedWorkoutV3(id)` | `3.0/athlete/savedworkout/{id}` | GET |
| `getProgramWorkoutV3(id)` | `3.0/athlete/programworkout/{id}` | GET |
| `getSurveyURL(id)` | `3.0/athlete/survey/question/{id}` | GET |
| `getSWSUrl(id)` | `1.0/athlete/savedworkoutset/{id}` | GET |
| `getSWUrl(id)` | `1.0/athlete/savedworkout/{id}` | GET |
| `getSWSEUrl(id)` | `1.0/athlete/savedworkoutsetexercise/{id}` | GET |
| `_rescheduleSession(swId, date)` | `v5/savedWorkouts/{swId}/reschedule` | PUT |

### Programming Service (~line 443322)

| Function Name | Endpoint | Method |
|---|---|---|
| `_getPrograms` | `1.0/athlete/programming/programs` | GET |
| `_getSurveys(swIds)` | `surveys?swIds=[{ids}]` | GET |

### Program Workout Service (~line 451038)

| Function Name | Endpoint | Method |
|---|---|---|
| `getProgramWorkoutData(pwId, teamId, userId?)` | `v5/programWorkouts/{pwId}/teams/{teamId}?userId={userId}` | GET |
| (personal calendar) | `v5/personalCalendar/programAndLog` | GET |
| `_publishProgramWorkouts` | `v5/programWorkouts/publish` | POST |

### Messaging Service (~line 457913)

| Function Name | Endpoint | Method |
|---|---|---|
| `_getComments(streamId, lastCommentId?)` | `v5/messaging/streams/{streamId}/comments?lastCommentId={id}` | GET |
| `_postComment(streamId, commentId)` | `v5/messaging/streams/{streamId}/comments/{commentId}` | POST |
| `_loadStreams` | `v5/messaging/streams` | GET |
| `_loadAthleteStreams(athleteId)` | `v5/messaging/streams/athletes/{athleteId}` | GET |
| (reactions) | `v5/messaging/reactions` | GET/POST |

### Profile Service (~line 461035)

| Function Name | Endpoint | Method |
|---|---|---|
| `_getAthleteSummary(userId?, useMetric)` | `v5/athleteProfile/summary?user_id={id}&use_metric={0\|1}` | GET |
| `_getAthleteProfile(userId)` | `v5/athleteProfile/{userId}` | GET |
| `_updateUser(userId)` | `v5/users/{userId}` | PUT |

### User Service (~line 488289)

| Function Name | Endpoint | Method |
|---|---|---|
| `_getUserInfo` | `1.0/user/userInfo` | GET |
| `_updateEmail` | `1.0/user/email` | PUT |
| `_updateUsername` | `1.0/user/username` | PUT |
| `_updateUserInfo` | `1.0/user/userInfo` | PUT |
| `_registerPushToken` | `v5/userPushTokens` | POST |
| `_unregisterPushToken(playerId)` | `v5/userPushTokens?onesignalPlayerId={playerId}` | DELETE |
| `_submitFeedback` | `2.0/feedback` | POST |
| `_adminUser(userId)` | `1.0/admin/user/{userId}` | GET |

### Notification Service (~line 524547)

| Function Name | Endpoint | Method |
|---|---|---|
| `_getCounts` | `v5/notifications/counts` | GET |
| `_getNotifications` | `v5/notifications` | GET |
| `_markViewed` | `v5/notifications/viewed` | PUT |
| `_markRead` | `v5/notifications/read` | PUT |
| `_getSettings(tzName)` | `v5/notifications/settings?tzName={tz}` | GET |
| `_setSettings` | `v5/notifications/settings` | PUT |
| `_setAllEmail` | `v5/notifications/settings/setAllEmail` | PUT |
| `_setAllPush` | `v5/notifications/settings/setAllPush` | PUT |

### Exercise & Circuit Service (~line 1058088)

| Function Name | Endpoint | Method |
|---|---|---|
| (circuits by team) | `v5/users/circuits?teamId={teamId}` | GET |
| (circuit history) | `v5/users/circuits/history` | GET |
| (exercises by team) | `v5/users/exercises?teamId={teamId}` | GET |
| (exercise history) | `v5/users/exercises/history` | GET |
| (circuit by id) | `v5/users/circuits/{id}` | GET/PUT/DELETE |
| (exercise detail) | `v5/exercises/{id}` | GET |
| (exercise by id) | `v5/users/exercises/{id}` | GET/PUT/DELETE |
| (recent exercises) | `v5/users/exercises/recent` | GET |

### Content Manager / Personal Calendar Service (~line 1091940)

| Function Name | Endpoint | Method |
|---|---|---|
| (personal sessions) | `v5/personalCalendar/sessions` | GET |
| (program workouts) | `v5/programWorkouts/{id}` | GET |
| (workouts) | `v5/workouts/{id}` | GET/POST/PUT |
| (workout template) | `v5/workouts/template` | POST |
| (session templates) | `v5/personalCalendar/sessions/templates` | GET |
| (content sessions) | `v5/contentManager/sessions` | GET |

### Workout Builder Service (~line 1075840)

| Function Name | Endpoint | Method |
|---|---|---|
| (workout set exercises) | `v5/workoutSetExercises/{id}` | GET/PUT/DELETE |
| (workout sets) | `v5/workoutSets/{id}` | GET/PUT/DELETE |
| (workouts) | `v5/workouts/{id}` | GET/POST/PUT |
| (workout combos) | `v5/workoutCombos/{id}` | GET/PUT |
| (saved WSE) | `v5/savedWorkoutSetExercises/{id}` | GET/PUT |

### Miscellaneous Services

| Endpoint | Method | Line | Purpose |
|---|---|---|---|
| `v5/yearInReview` | GET | 1365920 | Year in review |
| `v5/headCoach` | GET | 1371347 | Head coach info |
| `v5/athletePro/access` | GET | 1371457 | Pro subscription status |
| `v5/athletePro/subscription` | GET | 919360 | Pro subscription detail |
| `v5/athletePro/settings` | GET/PUT | 919675 | Pro settings |
| `v5/addProgramToCalendar` | POST | 934977 | Add program |
| `v5/userLicenses/{id}` | GET | 940012 | User licenses |
| `v5/workoutStats/trainingLoad?...` | GET | 980629 | Training load stats |
| `v5/lowProgramming/teams?dateToday=...` | GET | 1121925 | Low programming |
| `v5/marketplace/playStore/receipt` | POST | 523971 | Play Store receipt |
| `v5/marketplace/iap/options?theme={theme}` | GET | 1095725 | IAP options |
| `v5/athleteTrialLicenses` | GET/POST | 1283939 | Athlete trial |
| `v5/userAgreementTerms/hasAgreed` | GET | 1198754 | User agreement |
| `v5/trackAthleteOnboarding` | POST | 1218760 | Onboarding |
| `public/v5/users/account/sendResetPasswordEmail` | POST | 1269944 | Forgot password |
| `public/v5/users/account/resetPassword` | POST | 1270988 | Reset password |
| `public/v5/users/createAthleteAccount` | POST | 1272994 | Create account |
| `public/v5/features` | GET | 1273657 | Public features |

---

## Redux Store Structure

The app uses Redux with the following top-level state slices (from ~line 439655):

```
training, user, profileImage, threads, ui, privacyPreferences,
workingMaxes, device, leaderboard, accessCodeReducers, userProgramming,
userLicenseLookup, coachContext, loggingInputTree, userStats,
athleteSummaryStats, features, performances, athleteProfileData,
hasBeenSeen, accessCode, notifications, notificationSettings,
exerciseNotes, hasSeenRescheduleAlert, template, messaging,
hasDismissedNewProgram, activity
```

The coach-specific slice `coachContext` (~line 440543) exports:
```
ACTIONS, athletes, coachContext, context, invites,
loadAthletes, loadInvites, loadTeams, setAthleteContext,
setTeamContext, teams, unsetContext
```

Coach Redux actions (~line 440585):
```
TEAMS_LOAD, ATHLETES_LOAD, INVITES_LOAD, TEAM_CONTEXT_SET,
ATHLETE_CONTEXT_SET, UNSET_CONTEXT, RESET_ALL
```

---

## Data Models & Enums

Sources: Hermes bytecode (reducers/sagas) + coach web app JS bundle (`coachapp.trainheroic.com/main-80db8f5/static/js/main.91c38189.js`, 6.3MB).

The service layer does **zero transformation** — `authenticatedFetch` returns raw JSON and Redux stores it as-is. API response shape = Redux state shape.

### Enums

#### Param Type (exercise measurement — 19 types)

| Value | Name | Description |
|---|---|---|
| 0 | NONE | No parameter |
| 1 | WEIGHT | Weight in user's units |
| 2 | WEIGHT_PERCENT | Percentage of working max |
| 3 | REPS | Repetitions |
| 4 | TIME | Time as MM:SS |
| 5 | DISTANCE_YARDS | Distance in yards |
| 6 | DISTANCE_METERS | Distance in meters |
| 7 | HEIGHT_INCHES | Height in inches |
| 8 | CALORIES | Calories |
| 9 | LINEAR | Linear measurement |
| 10 | DISTANCE_MILES | Distance in miles |
| 11 | DISTANCE_FEET | Distance in feet |
| 12 | DISTANCE_INCHES | Distance in inches |
| 13 | OTHER_NUMBER | Other numeric value |
| 14 | RPE | Rate of perceived exertion |
| 15 | WATTS | Power in watts |
| 17 | VELOCITY | Velocity |
| 18 | SECONDS | Time in raw seconds |
| 19 | WEIGHT_KG | Explicit kg weight |

#### Program Type

| Value | Name | URL Slug |
|---|---|---|
| 0 | TEAM | `team` |
| 1 | CALENDAR | `calendar` |
| 2 | FIXED | `program` |
| 4 | ATHLETE_CALENDAR | — |
| 5 | COACH_ATHLETE_CALENDAR | `athlete` |
| 6 | INVITED_ATHLETE_CALENDAR | `invited-athlete` |

#### Block Type (workout section category)

| Value | Name |
|---|---|
| 0 | Uncategorized |
| 1 | Prep |
| 2 | Speed/Agility |
| 3 | Skill/Tech |
| 4 | Strength/Power |
| 5 | Conditioning |
| 6 | Recovery |
| 7 | Survey |
| 8 | Biometric |

#### Leaderboard / Redzone Type

| Value | Name |
|---|---|
| 0 | COMPLETION |
| 1 | WEIGHT |
| 2 | REPS |
| 3 | ROUNDS |
| 4 | TIME |
| 5 | YARDS |
| 6 | METERS |
| 7 | FEET |
| 8 | CALORIES |
| 10 | MILES |
| 12 | INCHES |
| 13 | OTHER |
| 15 | WATTS |
| 16 | PERCENT |
| 17 | VELOCITY |
| 18 | SECONDS |

#### Notification Type

| Value | Name |
|---|---|
| 1 | SESSION_PUBLISHED_TEAM |
| 2 | SESSION_PUBLISHED_ONE_TO_ONE |
| 3 | FEED_COMMENT_TEAM |
| 4 | FEED_COMMENT_ONE_TO_ONE |
| 5 | FEED_REPLY_AUTHOR_TEAM |
| 6 | FEED_REPLY_DISCUSSION_TEAM |
| 7 | FEED_REPLY_ONE_TO_ONE |
| 8 | FEED_LIKE_TEAM |
| 9 | FEED_LIKE_ONE_TO_ONE |
| 10 | EXERCISE_COMMENT |
| 11 | SESSION_REPLY |
| 12 | SESSION_REPLY_LIKE |
| 13 | SESSION_SUMMARY_COMMENT |
| 14 | SESSION_SUMMARY_COMMENT_SHARE_WITH_TEAM |
| 15 | SESSION_LIKE |
| 16 | LEADERBOARD_LIKE |
| 17 | SESSION_PUBLISHED_BATCH_TEAM |
| 18 | SESSION_PUBLISHED_BATCH_ONE_TO_ONE |
| 19 | SESSION_COMPLETE_ONE_TO_ONE |
| 20 | COMPLETE_SESSION_REMINDER |
| 26 | CIRCUIT_COMMENT |
| 27 | SESSION_REPLY_AUTHOR |
| 28 | SESSION_COMMENT |

#### Context Type (coach view mode)

| Value | Name |
|---|---|
| 0 | USER |
| 1 | ATHLETE |
| 2 | TEAM |

### Response Object Shapes

#### Team (`GET /1.0/coach/teams`)

```
{
  id:                         number,
  group_id:                   number,
  title:                      string,
  type:                       number,     // ProgramType enum
  logo:                       string,     // URL
  athlete_id:                 number,     // for 1:1 teams
  pub_days:                   number,     // auto-publish days ahead
  pub_enabled:                number,     // auto-publish enabled (0|1)
  pub_time:                   string,     // auto-publish time
  group_team_subscription_id: number|null,
  teamSubscription:           boolean,
  subscription:               boolean
}
```

#### Athlete (`GET /v5/athletes`)

```
{
  id:           number,
  fullName:     string,     // pre-formatted "First Last"
  imageProfile: string      // profile image URL
}
```

Note: The local `user` object (from auth) uses separate `name_first`/`name_last` fields, but the `/v5/athletes` response pre-formats as `fullName`.

#### Invite (`GET /v5/athletes/invites`)

```
{
  imageProfile: string,     // profile image URL
  email:        string      // invite email (used as display name)
}
```

#### Session / ProgramWorkout (`GET /3.0/.../programworkout/range`)

```
{
  id:            number,     // programWorkoutId
  workout_id:    string,     // workout content ID
  date:          string,     // "YYYY-MM-DD"
  title:         string,
  published:     number,     // 0 or 1
  program_type:  number,     // ProgramType enum
  workoutSets:   array,      // array of Block objects
  setKeys:       array,      // keys to blocks (normalized)
  year:          number,
  month:         number,
  day:           number,
  timeline_day:  number,
  pw_id:         number,     // programWorkout ID alias
  eType:         string      // "w" for workout
}
```

#### Block / WorkoutSet (nested in session)

```
{
  id:                  number|null,
  workout_id:          number|null,
  workout_combo_id:    number|null,
  type:                number,     // Block Type enum (0-8)
  title:               string,
  instruction:         string,
  redzone_instruction: string,
  test_instruction:    string,
  order:               number,
  key:                 string,     // unique key (e.g., "k::xxxxx")
  is_redzone:          number,     // 0 or 1
  redzone_type:        number,     // Leaderboard/Redzone Type enum
  resets_working_max:  number|null,
  plain_text:          number,     // 1 = text-only block
  completed:           number,     // 0 or 1
  exercises:           array,      // array of SetExercise objects
  exerciseKeys:        array,      // keys for normalized exercises
  workoutSetExercises: array,      // exercise objects (alternate)
  tags:                array,

  // Exercise category flags (all 0 or 1):
  is_agility:          number,
  is_endurance:        number,
  is_power:            number,
  is_power_endurance:  number,
  is_set:              number,
  is_speed:            number,
  is_strength:         number,
  is_test:             number,
  smaller_is_better:   number|null
}
```

#### SetExercise (nested in block)

```
{
  id:                              number,
  key:                             string,
  exercise_id:                     number,     // reference exercise library ID
  workout_set_id:                  number,     // parent block ID
  set_id:                          number,     // alias for workout_set_id
  title:                           string,
  instruction:                     string,
  order:                           number,
  param_count:                     number,     // number of sets (1-10)
  set_num:                         number,     // same as param_count
  no_sets:                         number,     // 1 = "For Completion" type
  custom:                          number,     // 1 = custom exercise

  // Parameter types (Param Type enum):
  param_1_type:                    number,
  param_2_type:                    number,

  // Prescribed values per set (up to 10):
  param_1_data_1 ... param_1_data_10:  string,
  param_2_data_1 ... param_2_data_10:  string,

  workout_set_exercise_template_id: number|null,
  reference_max_exercise_id:       number|null,
  video_url:                       string,
  thumbnail_url:                   string,
  tags:                            array,
  points_of_performance:           string,
  abr:                             string,    // abbreviation (display text)
  abr2:                            string,    // second abbreviation
  use_count:                       number,
  eType:                           string,
  isNew:                           boolean,
  setKey:                          string     // parent block key
}
```

#### Saved Workout (logged data — `summarizedSavedWorkout` in calendar response)

```
{
  saved_workout: {
    id:                     number,
    completed:              number,     // 0 or 1
    date_completed:         string,     // "YYYY-MM-DD HH:MM:SS" or epoch
    rpe:                    number,     // rate of perceived exertion
    completion_duration:    number,     // duration in seconds
    date_rescheduled:       string|null,
    is_in_compliance_mode:  number,
    notes_on_feed:          string,
    percent_completed:      number,
    rx:                     number,     // 1 = as prescribed
    status:                 number,
    timestamp_completed:    string|null
  },
  workout:              object,         // workout definition
  comments:             array,
  personal_cal:         number,
  team_org_id:          number,
  group_team_subscription_id: number,
  athleteFullName:      string,
  athleteIsNew:         boolean,
  team_logo:            string,
  coach_logo:           string,
  team_title:           string,
  program_title:        string,
  date:                 string,
  feed_item_id:         number
}
```

#### Logged Exercise Set Data (set-level `param_*_made` fields)

```
{
  completed:                number,     // 0 or 1
  param_1_made:             number,     // reps/weight achieved (0 or 1)
  param_1_data_1:           string,     // actual value
  param_1_data_1_prescribed: string,    // prescribed value
  notes:                    string      // user comments
}
```

#### Team Access / License (from `/v5/teamAccess/code`)

```
{
  team_id:              number,
  team_title:           string,
  team_logo:            string,
  team_org_id:          number,
  coach_name_first:     string,
  coach_name_last:      string,
  coach_image_profile:  string,
  access_code:          string,
  program_type:         number,     // ProgramType enum
  program_id:           number,
  user_id:              number,     // coach's user ID
  is_subscribed:        number,     // 0 or 1
  deleted:              number,
  program_title:        string,
  coach_logo:           string
}
```

#### LoggedInUser (from auth / Redux)

```
{
  id:         number,
  email:      string,
  lastName:   string,
  org_id:     number,
  use_metric: boolean,
  isBasic:    boolean
}
```

### Coach Web App Analytics Endpoints

The coach web app (`coachapp.trainheroic.com`) has analytics endpoints not present in the mobile app:

| Endpoint | Purpose |
|---|---|
| `/analytics/compliance` | Team compliance tracking |
| `/analytics/lift-history/{id}` | Lift history for exercise |
| `/analytics/lift-one-rep-max-history` | 1RM history |
| `/analytics/lift-one-rep-max` | Current 1RM |
| `/analytics/lift-progress` | Lift progress |
| `/analytics/readiness-survey-athlete` | Readiness survey (per athlete) |
| `/analytics/readiness-survey-team` | Readiness survey (per team) |
| `/analytics/training-summary-athlete` | Training summary (per athlete) |
| `/analytics/training-summary-team` | Training summary (per team) |
| `/analytics/working-max-history` | Working max history |
| `/analytics/marketplace-org-summary` | Marketplace org summary |
| `/analytics/marketplace-transactions` | Marketplace transactions |
| `/analytics/marketplace-trials` | Marketplace trial tracking |

### All Known ID Fields

```
athlete_id, data_id, entry_id, exercise_id, feed_id, feed_item_id,
group_id, group_team_subscription_id, org_id, owner_user_id,
parent_feed_item_id, partner_id, program_id, pw_id,
reference_max_exercise_id, saved_workout_set_exercise_id,
saved_workout_set_id, session_id, set_id, team_id, tracker_id,
trainheroic_reference_exercise_id, user_id, workout_combo_id,
workout_id, workout_set_exercise_template_id, workout_set_id
```

---

## Feature Flags

The app uses server-side feature flags fetched from `/v5/features` and `/public/v5/features`. Known flags (~line 440280):

| Flag | Description |
|---|---|
| `mobile_admin_login_as` | Admin login-as-user |
| `mobile_coach_log_for_athlete` | Coach logs on behalf of athlete |
| `mobile_coach_programming_v1/v3` | Coach programming views |
| `mobile_coach_publish` | Publish workouts to athletes |
| `mobile_coach_home_v1` | Coach home screen |
| `mobile_coach_create_exercise_v1` | Coach creates custom exercises |
| `mobile_athlete_create_exercise_v1` | Athlete creates custom exercises |
| `mobile_athlete_pro_v2` | Athlete Pro features |
| `mobile_athlete_pro_settings_v1` | Pro settings page |
| `mobile_exercise_stats` | Exercise statistics view |
| `mobile_exercise_history_v1` | Exercise history view |
| `mobile_exercise_history_editable_v1` | Editable exercise history |
| `mobile_streaks_v1` | Training streaks |
| `mobile_training_load_v1` | Training load metrics |
| `mobile_messaging_v1` | In-app messaging |
| `mobile_messaging_gif_v1` | GIF support in messages |
| `mobile_messaging_reactions_v1` | Message reactions |
| `mobile_messaging_video_v1` | Video in messages |
| `mobile_iap_v1` | In-app purchases |
| `year_in_review_v6` | Year in review feature |
| `mobile_user_delete_v1` | Account deletion |
| `mobile_apple_health_nutrition_v2` | Apple Health nutrition sync |
| `web_coach_show_nutrition_on_calendar_v1` | Nutrition on coach calendar |
| `mobile_account_creation_hcaptcha` | hCaptcha on account creation |

Role check: `user.isCoach` (Redux state) and `is_coach` (OneSignal tag at ~line 525627).

---

## Rate Limiting & Retry Behavior

**No rate limiting exists** — neither client-side nor observed server-side:

- **No 429 handling**: HTTP 429 (Too Many Requests) is not in the app's status code constants and is never checked. The `_authenticatedFetch` response handler (~line 332027) only checks:
  - `200 OK` → dispatch `CONNECTED` to Redux store
  - `503 SERVICE_UNAVAILABLE` → dispatch `MAINTENANCE_MODE_ON`, throw error
  - `403 FORBIDDEN` → dispatch `LOGOUT`, navigate to Welcome screen (session invalidated)
- **No retry logic**: No exponential backoff, no `Retry-After` header parsing, no retry counters in the API client
- **No client-side throttling**: App fires 10+ concurrent requests on startup with no semaphore, queue, or delay
- **No rate limit response headers** observed in frida-captured traffic (no `X-RateLimit-*`, `Retry-After`, etc.)
- **OkHttp defaults** apply (no custom dispatcher/pool config found in decompiled code):
  - Default dispatcher: 64 max concurrent requests, 5 per host
  - Default connection pool: 5 idle connections, 5 min keepalive

**Practical guidance for parallel export:**

| Parameter | Recommendation |
|---|---|
| Concurrent requests per user | Start with 5–10 (app does 10 on startup) |
| Watch for | `503` = maintenance mode, `403` = session invalidated |
| Session token | Long-lived (~33 min reported TTL, often works longer) |
| Retry strategy | Implement your own — the app has none |

---

## OkHttp Obfuscation Mapping (partial, from jadx)

| Obfuscated | Original |
|---|---|
| `Pd.z` | `OkHttpClient` |
| `Pd.z.a` | `OkHttpClient.Builder` |
| `Pd.D` | `Response` |
| `Pd.E` | `ResponseBody` |
| `Pd.C` | `RequestBody` |
| `Pd.t` | `Headers` |
| `Pd.v` | `Request` |
| `Pd.x` | `MediaType` |
| `Pd.y` | `MultipartBody` |
| `Pd.InterfaceC1049f` | `Callback` (OkHttp async callback) |
| `Pd.InterfaceC1048e` | `Call` |
| `com.facebook.react.modules.network.o` | Network event emitter |

---

## Concurrency: Up to 10+ concurrent requests

Observed on app startup via frida instrumentation of `NetworkingModule.sendRequest`:

```
reqId=5  POST /v5/telemetry/track              concurrent=1
reqId=6  GET  /v5/sessions/streaks/summary      concurrent=2
reqId=7  GET  /v5/sessions/streaks/summary      concurrent=3
...
reqId=14 GET  /2.0/athlete/workingMax           concurrent=9
reqId=15 GET  /3.0/athlete/programworkout/range  concurrent=10  peak=10
```

- All requests dispatched from a single thread: `mqt_native_modules` (React Native's native modules thread)
- OkHttp handles them concurrently via async `enqueue()` (callback-based dispatch)
- Peak observed: **10 concurrent requests** on startup
- Duplicate requests observed (streaks/summary called 7+ times) - likely retry logic

## Pagination: NO

- No `page`, `offset`, `limit`, `cursor`, `hasMore`, `nextToken` parameters in any observed requests
- The `/3.0/athlete/programworkout/range` endpoint uses **date range** bounds instead of pagination
- Exception: `/3.0/athlete/leaderboard/{id}?page=1&pageSize=9999` uses pagination but requests all pages at once

## Streaming: Client-side chunked reading (not HTTP streaming)

All requests observed with: `responseType=blob, useIncrementalUpdates=true, timeout=0`

When `useIncrementalUpdates=true`, `NetworkingModule.readWithProgress()` reads response body in **8192-byte (8KB) chunks**:

```java
// NetworkingModule.java (decompiled)
public void readWithProgress(int requestId, ResponseBody body) throws IOException {
    InputStream inputStream = body.byteStream();
    byte[] buffer = new byte[8192];  // MAX_CHUNK_SIZE_BETWEEN_FLUSHES
    while (true) {
        int bytesRead = inputStream.read(buffer);
        if (bytesRead == -1) return;
        EventEmitter.onIncrementalDataReceived(context, requestId,
            decode(buffer, bytesRead), contentLength, totalBytes);
    }
}
```

This is **NOT** HTTP streaming. It's React Native's client-side progressive reading of a standard HTTP response body.

---

## Frida Instrumentation Notes

- **DO NOT hook `Socket.connect`** - causes JNI crash (`java_string == null` in `GetStringChars`)
- **DO NOT hook `InputStream.read` broadly** - too invasive, destabilizes app
- **Safe hook point**: `NetworkingModule.sendRequest` - single chokepoint for all HTTP
- **Event emitter hooks**: `com.facebook.react.modules.network.o` methods `h` (response received), `b` (data received), `e` (incremental data), `g` (complete), `f` (error)
- **SSL bypass timing**: `SSLContext.init` hook must be injected before app startup (use frida spawn mode `-f`) to work
- **Process name**: `TrainHeroic` (not the package name `com.TrainHeroic.TrainHeroic`)
- **Class enumeration** (`Java.enumerateLoadedClasses`) times out on this app - too many classes

---

## Hermes Bytecode Decompilation

- **Tool**: `hermes-dec` (P1sec) v0.0.1
- **Install**: `pip3 install --break-system-packages git+https://github.com/P1sec/hermes-dec`
- **Parse**: `hbc-file-parser /tmp/bundle.hbc`
- **Decompile**: `hbc-decompiler /tmp/bundle.hbc /tmp/hermes-decompiled.js`
- **HBC version**: 96 (tool officially supports up to 89, but produced output successfully)
- **Output quality**: Pseudo-code with register names and jump labels; function names and string constants preserved
- **Output size**: 60 MB, 1,373,435 lines, 38,334 functions decompiled
- **Decompiled file**: `/tmp/hermes-decompiled.js`

---

## Analysis Tools Used

- **apktool** - APK decompilation
- **jadx** (v1.5.3) - DEX to Java decompilation
- **hermes-dec** (P1sec) - Hermes bytecode decompilation
- **frida** (17.6.2) - Runtime instrumentation
- **mitmdump** (mitmproxy) - Traffic interception

---

## Legal Notice

This analysis was performed for educational and research purposes only. Always respect terms of service and applicable laws when analyzing applications.
