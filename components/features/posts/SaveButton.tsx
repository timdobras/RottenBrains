"use client";
import { useUser } from "@/hooks/UserContext";
import { removeSave, savePost } from "@/lib/client/updatePostData";
import { useCallback, useEffect, useState } from "react";

const SaveButton: React.FC<any> = ({ post }: any) => {
  const [saved, setSaved] = useState<boolean>(post.has_saved);
  const { user } = useUser();
  const postId = post.post_id;
  const userId = user?.id.toString();

  const handleSave = useCallback(async () => {
    if (userId) {
      setSaved((prevSaved) => !prevSaved); // Optimistic update
      try {
        if (saved) {
          await removeSave(userId, postId);
        } else {
          await savePost(userId, postId);
        }
      } catch (error) {
        setSaved((prevSaved) => !prevSaved); // Revert if there's an error
        console.error("Error saving or removing save:", error);
      }
    }
  }, [userId, postId, saved]);

  if (!userId) {
    return null; // Return null if user ID isn't available
  }

  return (
    <button onClick={handleSave}>
      {saved ? (
        <img
          src={"/assets/icons/bookmark-solid.svg"}
          alt="Saved"
          width={30}
          height={30}
          className="invert-on-dark"
        />
      ) : (
        <img
          src={"/assets/icons/bookmark-outline.svg"}
          alt="Not Saved"
          width={30}
          height={30}
          className="invert-on-dark"
        />
      )}
    </button>
  );
};

export default SaveButton;
