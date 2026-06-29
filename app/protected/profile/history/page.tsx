import UserWatchHistory from '@/components/features/profile/UserWatchHistory';
import { getCurrentUser } from '@/lib/db/queries';

export default async function ProtectedPage() {
  const user = await getCurrentUser();
  if (!user) return <p>Loading User</p>;
  return <UserWatchHistory userId={user.id.toString()}></UserWatchHistory>;
}
