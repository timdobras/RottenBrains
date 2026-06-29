import UserPostsType from '@/components/features/profile/UserPostsType';
import { getCurrentUser } from '@/lib/db/queries';

export default async function ProtectedPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Loading User</p>;
  return <UserPostsType userId={user.id.toString()} media_type={'movie'}></UserPostsType>;
}
