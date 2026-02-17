import { type NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.trainheroic.com";
const APP_VERSION = "8.8.0";

async function proxyRequest(
	request: NextRequest,
	params: Promise<{ path: string[] }>,
) {
	const { path } = await params;
	const apiPath = `/${path.join("/")}`;
	const url = new URL(request.url);
	const queryString = url.search;

	const sessionToken = request.headers.get("x-session-token");
	if (!sessionToken) {
		return NextResponse.json(
			{ error: "Missing session token" },
			{ status: 401 },
		);
	}

	const resp = await fetch(`${API_BASE}${apiPath}${queryString}`, {
		method: request.method,
		headers: {
			"session-token": sessionToken,
			"x-mobile-app-version": APP_VERSION,
			"Content-Type": "application/json",
		},
	});

	const data = await resp.json();

	if (!resp.ok) {
		return NextResponse.json(data, { status: resp.status });
	}

	return NextResponse.json(data);
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
