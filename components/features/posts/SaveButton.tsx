'use client';
import { Bookmark } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@/hooks/UserContext';
import { removeSave, savePost } from '@/lib/client/updatePostData';

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
        console.error('Error saving or removing save:', error);
      }
    }
  }, [userId, postId, saved]);

  if (!userId) {
    return null; // Return null if user ID isn't available
  }

  return (
    <button onClick={handleSave}>
      <Bookmark size={30} className={saved ? 'fill-current' : ''} />
    </button>
  );
};

export default SaveButton;
