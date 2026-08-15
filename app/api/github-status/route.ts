import { NextResponse } from "next/server";

const GITHUB_STATUS_URL = "https://www.githubstatus.com/api/v2/status.json";

export async function GET() {
  try {
    const res = await fetch(GITHUB_STATUS_URL, {
      // Revalidate periodically instead of hammering the upstream API on
      // every poll from every client.
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to reach GitHub status API" },
      { status: 502 },
    );
  }
}
