import type {
	AuthSession,
	CatalogExercise,
	PlannedWorkout,
	PublishResult,
	PublishTarget,
	TrainHeroicAthlete,
	TrainHeroicTeam,
} from "./types";

export async function login(
	email: string,
	password: string,
): Promise<AuthSession> {
	const resp = await fetch("/api/auth", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});

	if (!resp.ok) {
		const err = await resp.json().catch(() => ({}));
		throw new Error(err.message || `Login failed (${resp.status})`);
	}

	const data = await resp.json();
	return { session_id: data.session_id, user_id: data.id };
}

async function apiRequest<T>(
	path: string,
	sessionToken: string,
	options: RequestInit = {},
): Promise<T> {
	const resp = await fetch(`/api/trainheroic${path}`, {
		...options,
		headers: { "x-session-token": sessionToken },
		body: options.body,
	});

	if (!resp.ok) {
		const err = await resp.json().catch(() => ({}));
		throw new Error(err.message || err.error || `API error: ${resp.status}`);
	}

	return resp.json();
}

async function apiGet<T>(path: string, sessionToken: string): Promise<T> {
	return apiRequest<T>(path, sessionToken);
}

async function apiSend<T>(
	method: "POST" | "PUT" | "DELETE",
	path: string,
	sessionToken: string,
	body?: unknown,
): Promise<T> {
	return apiRequest<T>(path, sessionToken, {
		method,
		body: body === undefined ? undefined : JSON.stringify(body),
	});
}

export async function fetchUserProfile(userId: number, sessionToken: string) {
	return apiGet<any>(`/v5/users/${userId}`, sessionToken);
}

export async function fetchProfileStats(userId: number, sessionToken: string) {
	return apiGet<any>(
		`/v5/athleteProfile/summary?user_id=${userId}&use_metric=1`,
		sessionToken,
	);
}

export async function fetchWorkouts(
	sessionToken: string,
	startDate = "2020-01-01",
	endDate = "2030-12-31",
) {
	return apiGet<any[]>(
		`/3.0/athlete/programworkout/range?startDate=${startDate}&endDate=${endDate}&preview=false`,
		sessionToken,
	);
}

export async function fetchCoachTeams(
	sessionToken: string,
): Promise<TrainHeroicTeam[]> {
	return apiGet<TrainHeroicTeam[]>("/1.0/coach/teams", sessionToken);
}

export async function fetchCoachAthletes(
	sessionToken: string,
): Promise<TrainHeroicAthlete[]> {
	return apiGet<TrainHeroicAthlete[]>("/v5/athletes", sessionToken);
}

export async function fetchExerciseCatalog(
	sessionToken: string,
	userId: number,
	teamId?: number,
): Promise<CatalogExercise[]> {
	const params = new URLSearchParams();
	params.set("userId", String(userId));
	if (teamId) params.set("teamId", String(teamId));
	return apiGet<CatalogExercise[]>(
		`/v5/users/exercises?${params.toString()}`,
		sessionToken,
	);
}

export async function fetchRecentExercises(
	sessionToken: string,
): Promise<CatalogExercise[]> {
	return apiGet<CatalogExercise[]>("/v5/users/exercises/recent", sessionToken);
}

export async function createWorkoutTemplate(
	sessionToken: string,
	workout: PlannedWorkout,
) {
	return apiSend<any>("POST", "/v5/workouts/template", sessionToken, {
		title: workout.title,
		workoutSets: workout.blocks.map((block) => ({
			title: block.title,
			type: 4,
			order: block.order,
			exercises: block.exercises.map((exercise) => ({
				exercise_id: exercise.exercise_id,
				title: exercise.title,
				order: exercise.order,
				param_count: exercise.sets.length,
				param_1_type: 19,
				param_2_type: 3,
				...Object.fromEntries(
					exercise.sets.flatMap((set) => [
						[`param_1_data_${set.set_number}`, String(set.weight_kg ?? "")],
						[`param_2_data_${set.set_number}`, String(set.reps)],
					]),
				),
				instruction: exercise.instruction || "",
			})),
		})),
	});
}

export async function publishProgramWorkout(
	sessionToken: string,
	workout: PlannedWorkout,
	target: PublishTarget,
	templateId?: number,
): Promise<PublishResult> {
	const body = {
		date: workout.date,
		workout_id: templateId,
		title: workout.title,
		team_id: target.teamId,
		athlete_id: target.athleteId,
	};
	const result = await apiSend<any>(
		"POST",
		"/v5/programWorkouts/publish",
		sessionToken,
		body,
	);
	return {
		status: "published",
		workoutId: result.workout_id || result.id || templateId,
		programWorkoutId: result.program_workout_id || result.pw_id,
	};
}
