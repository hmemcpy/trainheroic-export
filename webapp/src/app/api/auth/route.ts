import { type NextRequest, NextResponse } from "next/server";

const API_BASE = "https://api.trainheroic.com";

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

	return NextResponse.json(data);
}
