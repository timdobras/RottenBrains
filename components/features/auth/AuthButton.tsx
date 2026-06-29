import Link from 'next/link';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getCurrentUser } from '@/lib/server/current-user';

export default async function AuthButton() {
  const user = await getCurrentUser();

  const signOut = async () => {
    'use server';
    await auth.api.signOut({ headers: await headers() });
    redirect('/login');
  };

  return user ? (
    <div className="flex items-center gap-4">
      <form action={signOut}>
        <button className="z-10 items-center gap-2 rounded-[8px] bg-foreground/10 px-6 py-2 drop-shadow-lg hover:scale-105">
          Logout
        </button>
      </form>
    </div>
  ) : (
    <Link
      href="/login"
      className="z-10 items-center gap-2 rounded-[8px] bg-accent px-6 py-2 drop-shadow-lg hover:scale-105"
    >
      Get Started
    </Link>
  );
}
