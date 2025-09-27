import { useUser } from "@/hooks/UserContext";
import UserPostsType from "@/components/features/profile/UserPostsType";

type Params = Promise<{ userId: string }>;
export default async function ProtectedPage({ params }: { params: Params }) {
  const { userId } = await params;

  return <UserPostsType userId={userId} media_type={"tv"}></UserPostsType>;
}
