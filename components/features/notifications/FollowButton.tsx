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
    <button
      onClick={handleFollow}
      className="flex items-center justify-center rounded-full bg-foreground/10 px-4 py-1"
    >
      <p>{`${followed ? "Following" : "Follow back"}`}</p>
    </button>
  );
};

export default FollowButton;
