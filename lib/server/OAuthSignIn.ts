'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

type SocialProvider = 'google' | 'discord';

export async function oAuthSignIn(provider: SocialProvider) {
  if (!provider) {
    return redirect('/login?message=No provider selected');
  }

  let url: string | undefined | null;
  try {
    // Better Auth handles the OAuth callback at /api/auth/callback/<provider>,
    // then redirects to callbackURL. Returns the provider URL to send the user to.
    const res = await auth.api.signInSocial({
      body: { provider, callbackURL: '/' },
      headers: await headers(),
    });
    url = res.url;
  } catch {
    return redirect('/login?message=Could not authenticate');
  }

  if (!url) {
    return redirect('/login?message=Could not authenticate');
  }
  redirect(url);
}
