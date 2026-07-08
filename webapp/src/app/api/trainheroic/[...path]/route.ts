import { type NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.trainheroic.com";
const APP_VERSION = "8.8.0";
const SESSION_COOKIE = "trainheroic_session";
const CACHE_TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
	expiresAt: number;
	data: unknown;
	status: number;
}

const responseCache = new Map<string, CacheEntry>();

function shouldCache(method: string, apiPath: string) {
	if (method !== "GET") return false;
	return [
		"/v5/users/exercises",
		"/v5/users/circuits",
		"/v5/exercises/",
		"/3.0/athlete/programworkout/range",
		"/v5/athleteProfile/",
		"/1.0/coach/teams",
		"/v5/athletes",
	].some((path) => apiPath.startsWith(path));
}

async function proxyRequest(
	request: NextRequest,
	params: Promise<{ path: string[] }>,
) {
	const { path } = await params;
	const apiPath = `/${path.join("/")}`;
	const url = new URL(request.url);
	const queryString = url.search;

	const sessionToken =
		request.headers.get("x-session-token") ||
		request.cookies.get(SESSION_COOKIE)?.value;
	if (!sessionToken) {
		return NextResponse.json(
			{ error: "Missing session token" },
			{ status: 401 },
		);
	}

	const bypassCache = request.headers.get("x-refresh-cache") === "1";
	const cacheable = shouldCache(request.method, apiPath);
	const cacheKey = `${sessionToken}:${apiPath}${queryString}`;
	if (cacheable && !bypassCache) {
		const cached = responseCache.get(cacheKey);
		if (cached && cached.expiresAt > Date.now()) {
			return NextResponse.json(cached.data, {
				status: cached.status,
				headers: { "x-trainheroic-cache": "hit" },
			});
		}
	}

	const init: RequestInit = {
		method: request.method,
		headers: {
			"session-token": sessionToken,
			"x-mobile-app-version": APP_VERSION,
			"Content-Type": "application/json",
		},
	};

	if (!["GET", "HEAD"].includes(request.method)) {
		const body = await request.text();
		if (body) init.body = body;
	}

	const resp = await fetch(`${API_BASE}${apiPath}${queryString}`, init);

	const data = await resp.json().catch(() => ({}));

	if (!resp.ok) {
		return NextResponse.json(data, { status: resp.status });
	}

	if (cacheable) {
		responseCache.set(cacheKey, {
			data,
			status: resp.status,
			expiresAt: Date.now() + CACHE_TTL_MS,
		});
	}

	return NextResponse.json(data, {
		status: resp.status,
		headers: cacheable ? { "x-trainheroic-cache": "miss" } : undefined,
	});
}

export async function GET(
	request: NextRequest,
	context: { params: Promise<{ path: string[] }> },
) {
	return proxyRequest(request, context.params);
}

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ path: string[] }> },
) {
	return proxyRequest(request, context.params);
}

export async function PUT(
	request: NextRequest,
	context: { params: Promise<{ path: string[] }> },
) {
	return proxyRequest(request, context.params);
}

export async function DELETE(
	request: NextRequest,
	context: { params: Promise<{ path: string[] }> },
) {
	return proxyRequest(request, context.params);
}
