import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // **Ensure session persistence**
  const response = await updateSession(request);

  // Ensure x-pathname header is valid and encoded
  const pathname = decodeURIComponent(request.nextUrl.pathname || "");
  response.headers.set("x-pathname", pathname);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
