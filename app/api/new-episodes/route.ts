// app/api/daily-new-episodes/route.ts

import { dailyNewEpisodesJob } from "@/lib/new_episodes";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    await dailyNewEpisodesJob();
    return NextResponse.json({
      message: "Daily new episodes job completed successfully.",
    });
  } catch (error) {
    console.error("Error in dailyNewEpisodesJob:", error);
    return new NextResponse(
      JSON.stringify({ error: "Failed to run daily new episodes job." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
