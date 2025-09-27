"use client";

import { usePathname, useRouter } from "next/navigation";

export const Tab = ({ name, link }: { name: string; link: string }) => {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = pathname === link;

  return (
    <p
      className={`cursor-pointer px-4 py-2 md:px-8 ${
        isActive
          ? "border-b-2 border-accent text-foreground"
          : "border-b border-foreground/10 text-foreground/60"
      }`}
      onClick={() => router.push(link)}
    >
      {name}
    </p>
  );
};
