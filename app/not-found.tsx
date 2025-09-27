// app/not-found.tsx
"use client";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <button onClick={() => router.back()}>Go Back</button>
      <p>or</p>
      <Link href="/">
        <p>Go to Home</p>
      </Link>
    </div>
  );
}
