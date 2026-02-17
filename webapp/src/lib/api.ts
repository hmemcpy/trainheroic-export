import type { AuthSession } from "./types";

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

async function apiGet(path: string, sessionToken: string) {
	const resp = await fetch(`/api/trainheroic${path}`, {
		headers: { "x-session-token": sessionToken },
	});

	if (!resp.ok) {
		throw new Error(`API error: ${resp.status}`);
	}

	return resp.json();
}

export async function fetchUserProfile(userId: number, sessionToken: string) {
	return apiGet(`/v5/users/${userId}`, sessionToken);
}

export async function fetchProfileStats(userId: number, sessionToken: string) {
	return apiGet(
		`/v5/athleteProfile/summary?user_id=${userId}&use_metric=1`,
		sessionToken,
	);
}

export async function fetchWorkouts(
	sessionToken: string,
	startDate = "2020-01-01",
	endDate = "2030-12-31",
) {
	return apiGet(
		`/3.0/athlete/programworkout/range?startDate=${startDate}&endDate=${endDate}&preview=false`,
		sessionToken,
	);
}
