import UserPostsType from '@/components/features/profile/UserPostsType';
import { useUser } from '@/hooks/UserContext';

type Params = Promise<{ userId: string }>;
export default async function ProtectedPage({ params }: { params: Params }) {
  const { userId } = await params;

  return <UserPostsType userId={userId} media_type={'tv'}></UserPostsType>;
}
