import { type NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.trainheroic.com";
const SESSION_COOKIE = "trainheroic_session";
const USER_COOKIE = "trainheroic_user";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

export async function GET(request: NextRequest) {
	const sessionId = request.cookies.get(SESSION_COOKIE)?.value;
	const userId = request.cookies.get(USER_COOKIE)?.value;

	if (!sessionId || !userId) {
		return NextResponse.json({ authenticated: false }, { status: 401 });
	}

	return NextResponse.json({
		authenticated: true,
		id: Number(userId),
	});
}

export async function POST(request: NextRequest) {
	const body = await request.json();

	const resp = await fetch(`${API_BASE}/auth`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	const data = await resp.json();

	if (!resp.ok) {
		return NextResponse.json(data, { status: resp.status });
	}

	const response = NextResponse.json({ id: data.id });
	response.cookies.set(SESSION_COOKIE, data.session_id, {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: COOKIE_MAX_AGE,
	});
	response.cookies.set(USER_COOKIE, String(data.id), {
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: COOKIE_MAX_AGE,
	});
	return response;
}

export async function DELETE() {
	const response = NextResponse.json({ ok: true });
	response.cookies.delete(SESSION_COOKIE);
	response.cookies.delete(USER_COOKIE);
	return response;
}
