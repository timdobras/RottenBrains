"use client";

import UserWatchHistory from "@/components/features/profile/UserWatchHistory";
import { useUser } from "@/hooks/UserContext";

export default function ProtectedPage() {
  const { user } = useUser();
  if (!user) return <p>Loading User</p>;
  return <UserWatchHistory userId={user?.id.toString()}></UserWatchHistory>;
}
