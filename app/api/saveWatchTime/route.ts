import { upsertWatchHistory } from "@/lib/supabase/serverQueries";
import { NextRequest, NextResponse } from "next/server";

interface WatchTimeData {
  time_spent: number;
  percentage_watched: string;
  user_id: string;
  media_type: string;
  media_id: number;
  season_number?: number;
  episode_number?: number;
}

export async function POST(req: NextRequest) {
  try {
    const data: WatchTimeData = await req.json();

    const result = await upsertWatchHistory(
      data.user_id,
      data.media_type,
      data.media_id,
      data.time_spent,
      data.percentage_watched,
      data.season_number ?? null,
      data.episode_number ?? null,
    );

    return NextResponse.json({
      message: "Watch time saved successfully",
      result,
    });
  } catch (error) {
    console.error("Error saving watch time:", error);
    return NextResponse.json(
      { message: "Error saving watch time" },
      { status: 500 },
    );
  }
}
