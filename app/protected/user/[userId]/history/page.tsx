import { useUser } from "@/hooks/UserContext";
import UserPostsType from "@/components/features/profile/UserPostsType";
import UserWatchHistory from "@/components/features/profile/UserWatchHistory";

type Params = Promise<{ userId: string }>;
export default async function ProtectedPage({ params }: { params: Params }) {
  const { userId } = await params;

  return <UserWatchHistory userId={userId}></UserWatchHistory>;
}
