'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useUser } from '@/hooks/UserContext';
import { addComment } from '@/lib/db/mutations';

interface AddCommentProps {
  post: any;
  user_id?: string;
  fetchComments?: () => Promise<void> | void;
  fetchReplies?: (parentId: string) => Promise<void> | void;
  parent_id?: string;
  autoFocus?: boolean;
  placeholder?: string;
}

const AddComment: React.FC<AddCommentProps> = ({
  post,
  user_id,
  fetchComments,
  fetchReplies,
  parent_id,
  autoFocus,
  placeholder,
}) => {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const postId = post.id;
  const { user } = useUser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || submitting) return;
    if (!user_id) {
      alert('You must be logged in to comment');
      return;
    }

    setSubmitting(true);
    setContent(''); // optimistic clear
    try {
      await addComment({ postId, content: text, parentId: parent_id });

      if (parent_id) await fetchReplies?.(parent_id);
      else await fetchComments?.();
    } catch (err) {
      console.error(err);
      setContent(text); // restore so the user doesn't lose their text
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full items-center gap-2 border-t border-foreground/10 p-2"
    >
      <Image
        src={user.image_url || '/assets/images/logo_new_black.svg'}
        alt=""
        width={32}
        height={32}
        className="aspect-square h-8 shrink-0 rounded-full bg-foreground/10 object-cover"
      />
      <div className="flex w-full items-center gap-2 rounded-full bg-foreground/10 px-3">
        <input
          type="text"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full appearance-none bg-transparent py-2 text-sm text-foreground focus:outline-none"
          placeholder={placeholder || 'Add a comment…'}
        />
        <button
          type="submit"
          disabled={!content.trim() || submitting}
          className="shrink-0 text-sm font-semibold text-accent transition-opacity disabled:opacity-40"
        >
          Post
        </button>
      </div>
    </form>
  );
};

export default AddComment;
