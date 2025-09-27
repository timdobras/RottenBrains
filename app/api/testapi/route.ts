// app/api/player/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Extract query parameters from the request URL
  const { searchParams } = new URL(req.url);
  const video_id = searchParams.get("video_id");
  const tmdb = searchParams.get("tmdb") ?? "0";
  const season = searchParams.get("season") ?? "0";
  const episode = searchParams.get("episode") ?? "0";

  if (!video_id) {
    return new NextResponse("Missing video_id", { status: 400 });
  }

  const player_font = "Roboto";
  const player_bg_color = "000000";
  const player_font_color = "ffffff";
  const player_primary_color = "34cfeb";
  const player_secondary_color = "6900e0";
  const player_loader = 3;
  const preferred_server = 0;
  const player_sources_toggle_type = 2;

  const request_url = `https://getsuperembed.link/?video_id=${video_id}&tmdb=${tmdb}&season=${season}&episode=${episode}&player_font=${player_font}&player_bg_color=${player_bg_color}&player_font_color=${player_font_color}&player_primary_color=${player_primary_color}&player_secondary_color=${player_secondary_color}&player_loader=${player_loader}&preferred_server=${preferred_server}&player_sources_toggle_type=${player_sources_toggle_type}`;

  try {
    const response = await fetch(request_url);
    const player_url = await response.text();

    if (player_url.startsWith("https://")) {
      // If the response is a valid URL, redirect the user
      return NextResponse.redirect(player_url);
    } else {
      // Otherwise, treat it as an error message
      const body = `<span style='color:red'>${player_url}</span>`;
      return new NextResponse(body, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    }
  } catch (error) {
    return new NextResponse("Request server didn't respond", { status: 500 });
  }
}
