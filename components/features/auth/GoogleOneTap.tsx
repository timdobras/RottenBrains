"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { CredentialResponse } from "google-one-tap";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (...args: any) => void;
          prompt: (...args: any) => void;
          // add more specific signatures if you want them strongly typed
        };
      };
    };
  }
}

// A small helper to generate nonce + hashedNonce
async function generateNoncePair(): Promise<[string, string]> {
  // random 32 byte array
  const randomValues = crypto.getRandomValues(new Uint8Array(32));
  // base64-encoded nonce
  const nonce = btoa(String.fromCharCode(...randomValues));

  // hash the nonce
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(nonce),
  );
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashedNonce = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return [nonce, hashedNonce];
}

export default function OneTapComponent() {
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    const initializeGoogleOneTap = async () => {
      const [nonce, hashedNonce] = await generateNoncePair();

      // Check if user is already logged in
      const { data: sessionData, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error);
        return;
      }
      if (sessionData.session) {
        // Already signed in, redirect or do nothing
        router.push("/");
        return;
      }

      // The global "google" object is loaded by <Script> below
      /* global google */
      // @ts-expect-error
      google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: async (response: CredentialResponse) => {
          try {
            const { data, error: signInError } =
              await supabase.auth.signInWithIdToken({
                provider: "google",
                token: response.credential as string,
                nonce,
              });

            if (signInError) throw signInError;
            console.log("Sign in successful. Data:", data);
            router.push("/");
          } catch (err) {
            console.error("Error signing in with Google One Tap:", err);
          }
        },
        nonce: hashedNonce,
        use_fedcm_for_prompt: true,
      });

      // Prompt the One Tap UI
      // @ts-expect-error
      google.accounts.id.prompt();
    };

    // Initialize as soon as the component mounts
    initializeGoogleOneTap();
  }, [router, supabase]);

  return (
    <>
      {/* Loads the google.accounts.id object */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="beforeInteractive"
      />
      {/* A container if needed, but not strictly required */}
      <div id="oneTap" className="fixed right-0 top-0 z-[100]" />
    </>
  );
}
