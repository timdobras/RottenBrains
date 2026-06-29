'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';

export async function login(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    // nextCookies() plugin sets the session cookie from inside this server action.
    await auth.api.signInEmail({ body: { email, password }, headers: await headers() });
  } catch {
    redirect('/error');
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    // `name` is required by Better Auth; the create hook defaults username to email.
    await auth.api.signUpEmail({ body: { email, password, name: email }, headers: await headers() });
  } catch {
    redirect('/error');
  }

  revalidatePath('/', 'layout');
  redirect('/');
}
