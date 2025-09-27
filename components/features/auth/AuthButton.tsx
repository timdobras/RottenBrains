import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { useEffect, useState } from "react";

export default async function AuthButton() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const signOut = async () => {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    return redirect("/login");
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
