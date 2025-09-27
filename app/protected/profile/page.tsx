"use client";

import UserPosts from "@/components/features/profile/UserPosts";
import { useUser } from "@/hooks/UserContext";

export default function ProtectedPage() {
  const { user } = useUser();
  if (!user) return <p>Loading User</p>;
  return <UserPosts userId={user.id.toString()}></UserPosts>;
}
