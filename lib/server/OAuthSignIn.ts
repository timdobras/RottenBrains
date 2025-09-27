"use server";

import { Provider } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function oAuthSignIn(provider: Provider) {
  if (!provider) {
    return redirect("/login?message=No provider selected");
  }

  const supabase = await createClient();

  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";

  // Decide whether to use https or http
  const isLocalhost = host.includes("localhost");
  const protocol = isLocalhost ? "http" : "https";

  // Build the callback URL
  const redirectUrl = `${protocol}://${host}/auth/callback`;

  // For Google, force the account chooser with queryParams: { prompt: "select_account" }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl,
      queryParams: {
        prompt: "select_account",
      },
    },
  });

  if (error) {
    return redirect("/login?message=Could not authenticate");
  }

  // Redirect to the URL returned by Supabase
  redirect(data.url);
}
