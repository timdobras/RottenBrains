'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUser } from '@/hooks/UserContext';
import { followUser, getFollowStatus, unFollowUser } from '@/lib/client/updateFollowingData';

interface SaveButtonProps {
  user_to_follow_id: string;
}

const FollowButton: React.FC<SaveButtonProps> = ({ user_to_follow_id }) => {
  const { user } = useUser();
  const userId = user?.id.toString();
  const queryClient = useQueryClient();

  const { data: followed, isLoading } = useQuery({
    queryKey: ['followStatus', userId, user_to_follow_id],
    queryFn: () => {
      if (!userId) return false;
      return getFollowStatus(userId, user_to_follow_id);
    },
    enabled: !!userId,
  });

  const { mutate: toggleFollow } = useMutation({
    mutationFn: async (isFollowed: boolean) => {
      if (!userId) return;
      if (isFollowed) {
        await unFollowUser(userId, user_to_follow_id);
      } else {
        await followUser(userId, user_to_follow_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followStatus', userId, user_to_follow_id] });
    },
  });

  const handleFollow = () => {
    if (userId && followed !== undefined) {
      toggleFollow(followed);
    }
  };

  if (!userId) {
    return null; // Or a login prompt
  }

  if (isLoading) {
    return (
      <div className="z-10 items-center gap-2 rounded-full bg-foreground/10 px-6 py-2 drop-shadow-lg">
        Loading...
      </div>
    );
  }

  return (
    <button onClick={handleFollow}>
      {followed ? (
        <div className="z-10 items-center gap-2 rounded-full bg-foreground/10 px-6 py-2 drop-shadow-lg hover:scale-105">
          Following
        </div>
      ) : (
        <div className="z-10 items-center gap-2 rounded-full bg-foreground/10 px-6 py-2 drop-shadow-lg hover:scale-105">
          Follow
        </div>
      )}
    </button>
  );
};

export default FollowButton;
