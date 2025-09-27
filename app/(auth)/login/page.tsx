import Link from "next/link";
import { redirect } from "next/navigation";
import { SubmitButton } from "../../../components/features/auth/SubmitButton";
import { OAuthButton } from "@/components/features/auth/OAuthSignIn";
import { createClient } from "@/lib/supabase/server";
import { login, signup } from "./actions";

type Params = Promise<{ message: string }>;

export default async function Login({
  searchParams,
}: {
  searchParams: Params;
}) {
  const { message } = await searchParams;

  return (
    <div className="relative mx-auto flex h-screen w-full flex-1 flex-col justify-center gap-2 px-8 sm:max-w-md">
      <script src="https://accounts.google.com/gsi/client" async></script>
      <form className="flex w-full flex-1 flex-col justify-center gap-2 text-foreground animate-in">
        <label className="text-md" htmlFor="email">
          Email
        </label>
        <input
          className="mb-6 rounded-md border bg-inherit px-4 py-2"
          name="email"
          placeholder="you@example.com"
          required
        />
        <label className="text-md" htmlFor="password">
          Password
        </label>
        <input
          className="mb-6 rounded-md border bg-inherit px-4 py-2"
          type="password"
          name="password"
          placeholder="••••••••••••"
          required
        />
        <SubmitButton
          formAction={login}
          className="mb-2 rounded-md bg-accent px-4 py-2 text-foreground"
          pendingText="Signing In..."
        >
          Sign In
        </SubmitButton>
        <OAuthButton></OAuthButton>
        <p className="mt-4 bg-foreground/10 p-4 text-center text-foreground">
          {message}
        </p>
        <p className="self-center text-gray-400">
          Don't have an account?{" "}
          <Link href="/register" className="text-accent">
            {" "}
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}
