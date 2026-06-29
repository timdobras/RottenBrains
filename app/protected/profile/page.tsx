import UserPosts from '@/components/features/profile/UserPosts';
import { getCurrentUser } from '@/lib/db/queries';

export default async function ProtectedPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Loading User</p>;
  return <UserPosts userId={user.id.toString()}></UserPosts>;
}
