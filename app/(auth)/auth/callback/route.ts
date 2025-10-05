// Example: app/api/auth/callback/route.ts
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is provided, use it; otherwise default to home
  const next = searchParams.get('next') ?? '/';

  const cookieStore = await cookies();

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Instead of redirecting directly to the destination, redirect to a dedicated callback page
      const callbackUrl = `${origin}/callback?next=${encodeURIComponent(next)}`;

      const response = NextResponse.redirect(callbackUrl);
      // Forward cookies
      for (const { name, value } of cookieStore.getAll()) {
        response.cookies.set(name, value, {
          path: '/',
          maxAge: 60 * 60 * 24 * 30,
        });
      }
      return response;
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
