import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SubmitButton } from "../../../components/features/auth/SubmitButton";
import { OAuthButton } from "@/components/features/auth/OAuthSignIn";
import { createClient } from "@/lib/supabase/server";

type Params = Promise<{ message: string }>;

export default async function Register({
  searchParams,
}: {
  searchParams: Params;
}) {
  const { message } = await searchParams;
  const signUp = async (formData: FormData) => {
    "use server";
    const headersList = await headers();
    const origin = headersList.get("origin");
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const username = formData.get("username") as string;
    const name = formData.get("name") as string;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/callback`,
      },
    });

    if (error) {
      console.log(error);
      return redirect("/register?message=Could not authenticate user");
    }

    // If sign-up is successful, insert the user's additional information into another table
    if (data.user) {
      const initials = name
        .split(" ")
        .map((word) => word[0])
        .join("");
      const avatarUrl = `https://ui-avatars.com/api/?name=${initials}&background=random&color=fff&size=128`;
      // Make sure that the sign-up returned a valid user
      const { error: insertError } = await supabase
        .from("users") // Replace 'profiles' with your actual table name
        .insert([
          {
            id: data.user.id, // Use the user's unique ID from the sign-up
            email,
            username,
            name,
            image_url: avatarUrl,
            // Add any other fields you need to store
          },
        ]);

      // Handle errors during the insertion process
      if (insertError) {
        console.log("Error inserting user profile:", insertError.message);
        return redirect("/register?message=Could not create user profile");
      }
    }

    return redirect("/login");
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
        </svg>{" "}
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
        <p className="mt-4 bg-foreground/10 p-4 text-center text-foreground">
          {message}
        </p>
        <p className="self-center text-gray-400">
          Already have an account?
          <a href="/login" className="text-accent">
            {" "}
            Sign In
          </a>
        </p>
      </form>
    </div>
  );
}
