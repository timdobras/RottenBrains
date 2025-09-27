"use client";
import { useUser } from "@/hooks/UserContext";
import {
  followUser,
  getFollowStatus,
  unFollowUser,
} from "@/lib/client/updateFollowingData";
import { useEffect, useState } from "react";

interface SaveButtonProps {
  user_to_follow_id: string;
}

const FollowButton: React.FC<SaveButtonProps> = ({ user_to_follow_id }) => {
  const [followed, setFollowed] = useState(false);

  const { user } = useUser();
  let userId: string;
  if (user) {
    userId = user.id.toString();
  }

  const handleFollow = async () => {
    if (userId) {
      try {
        if (followed) {
          await unFollowUser(userId!, user_to_follow_id);
        } else {
          await followUser(userId!, user_to_follow_id);
        }
        setFollowed(!followed);
      } catch (error) {
        console.error("Error following or unfollowing user:", error);
      }
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (user) {
        const isUserFollowed = await getFollowStatus(
          user.id.toString(),
          user_to_follow_id,
        ); // Assuming getSavedStatus is asynchronous
        setFollowed(isUserFollowed);
      }
    };

    fetchData();
  }, [user_to_follow_id, handleFollow]);

  if (userId! === null) {
    return null; // Return null or a loading indicator until user data is fetched
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
