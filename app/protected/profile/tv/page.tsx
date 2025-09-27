"use client";

import UserPostsType from "@/components/features/profile/UserPostsType";
import { useUser } from "@/hooks/UserContext";

export default function ProtectedPage() {
  const { user } = useUser();
  if (!user) return <p>Loading User</p>;
  return (
    <UserPostsType
      userId={user.id.toString()}
      media_type={"tv"}
    ></UserPostsType>
  );
}
