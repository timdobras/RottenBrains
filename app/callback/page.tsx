// app/callback/page.tsx
"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function CallbackPage() {
  const searchParams = useSearchParams();
  // Get the intended destination from the query string, or default to "/"
  const next = searchParams.get("next") || "/";

  useEffect(() => {
    // Force a full page reload to ensure that cookies are available in the new request.
    window.location.href = next;
  }, [next]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <p>Completing authentication. Please wait...</p>
    </div>
  );
}
