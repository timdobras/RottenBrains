import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { OAuthButton } from '@/components/features/auth/OAuthSignIn';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { SubmitButton } from '@/components/features/auth/SubmitButton';

type Params = Promise<{ message: string }>;

export default async function Register({ searchParams }: { searchParams: Params }) {
  const { message } = await searchParams;

  // Registration kill-switch (mirrors lib/auth.ts disableSignUp). When on, show a
  // closed notice instead of a sign-up form that the API would just reject.
  if (process.env.DISABLE_SIGNUP === 'true') {
    return (
      <div className="mx-auto flex h-screen w-full flex-1 flex-col items-center justify-center gap-4 px-8 text-center sm:max-w-md">
        <h1 className="text-2xl font-semibold text-foreground">Registration is closed</h1>
        <p className="text-foreground/70">
          New sign-ups are currently disabled. If you already have an account, you can still log in.
        </p>
        <a
          href="/login"
          className="rounded-md bg-accent px-4 py-2 text-foreground no-underline"
        >
          Go to Sign In
        </a>
      </div>
    );
  }

  const signUp = async (formData: FormData) => {
    'use server';
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const username = formData.get('username') as string;
    const name = formData.get('name') as string;
    const initials = name
      .split(' ')
      .map((word) => word[0])
      .join('');
    const avatarUrl = `https://ui-avatars.com/api/?name=${initials}&background=random&color=fff&size=128`;

    let userId: string | undefined;
    try {
      // Better Auth creates the user (the create hook + genre-stats trigger seed
      // the profile); `image` maps to users.image_url, `name` to users.name.
      const res = await auth.api.signUpEmail({
        body: { email, password, name, image: avatarUrl },
        headers: await headers(),
      });
      userId = res.user?.id;
    } catch (error) {
      console.error(error);
      return redirect('/register?message=Could not authenticate user');
    }

    // Apply the chosen username (the create hook otherwise defaults it to email).
    if (userId) {
      try {
        await prisma.users.update({ where: { id: userId }, data: { username } });
      } catch (error) {
        console.error('Error setting username:', error);
      }
    }

    return redirect('/');
  };

  return (
    <div className="mx-auto flex h-screen w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <Link
        href="/"
        className="group absolute left-8 top-8 flex items-center rounded-md bg-btn-background px-4 py-2 text-sm text-foreground no-underline hover:bg-btn-background-hover"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>{' '}
        Back
      </Link>

      <form className="flex w-full flex-1 flex-col justify-center gap-2 text-foreground animate-in">
        <label className="text-md" htmlFor="username">
          Username
        </label>
        <input
          className="mb-6 rounded-md border bg-inherit px-4 py-2"
          name="username"
          placeholder="crazyavocado"
          required
        />
        <label className="text-md" htmlFor="name">
          Name
        </label>
        <input
          className="mb-6 rounded-md border bg-inherit px-4 py-2"
          name="name"
          placeholder="John Black"
          required
        />
        <label className="text-md" htmlFor="email">
          Email
        </label>
        <input
          className="mb-6 rounded-md border bg-inherit px-4 py-2"
          name="email"
          placeholder="johnblack@gmail.com"
          required
        />
        <label className="text-md" htmlFor="password">
          Password
        </label>
        <input
          className="mb-6 rounded-md border bg-inherit px-4 py-2"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />
        <SubmitButton
          formAction={signUp}
          className="mb-2 rounded-md bg-accent px-4 py-2 text-foreground"
          pendingText="Signing Up..."
        >
          Sign Up
        </SubmitButton>
        <OAuthButton></OAuthButton>
        <p className="mt-4 bg-foreground/10 p-4 text-center text-foreground">{message}</p>
        <p className="self-center text-gray-400">
          Already have an account?
          <a href="/login" className="text-accent">
            {' '}
            Sign In
          </a>
        </p>
      </form>
    </div>
  );
}
