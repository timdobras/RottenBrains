import { updateGenreStats } from "@/lib/supabase/serverQueries";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { genreIds, mediaType, userId } = await request.json();

    if (!genreIds || !mediaType || !userId) {
      return NextResponse.json(
        { error: "Missing parameters" },
        { status: 400 },
      );
    }

    const response = await updateGenreStats({ genreIds, mediaType, userId });

    if (response.success) {
      return NextResponse.json({ message: "Genre stats updated successfully" });
    } else {
      return NextResponse.json(
        { error: "Failed to update genre stats", details: response.error },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
