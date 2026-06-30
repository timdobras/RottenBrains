'use client';
import { Heart, MessageCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { likePost, removeLike } from '@/lib/client/updatePostData';
import { getPostComments } from '@/lib/db/client-actions';
import AddComment from './AddComment';
import CommentCard from './CommentCard';
import { usePostLike } from './PostLikeContext';

const PostStats = ({ post, user_id, current_user, post_link }: any) => {
  const postId = post.id;
  const [state, setState] = useState({
    isOpen: false,
    comments: [],
    commentCount: post.total_comments || 0,
    loading: true,
  });

  // Shared like state (kept in sync with the double-tap-to-like gesture). Falls back
  // to a local toggle if this card is ever rendered outside a PostLikeProvider.
  const shared = usePostLike();
  const [localLike, setLocalLike] = useState({
    liked: !!current_user?.has_liked,
    likes: post.total_likes || 0,
    animate: false,
  });

  const liked = shared ? shared.liked : localLike.liked;
  const likes = shared ? shared.likes : localLike.likes;
  const animate = shared ? shared.animate : localLike.animate;

  const handleLike = () => {
    if (!user_id) return;
    if (shared) {
      shared.toggleLike();
      return;
    }
    // Fallback path (no provider): optimistic local toggle.
    const next = !localLike.liked;
    const prevLikes = localLike.likes;
    setLocalLike({ liked: next, likes: next ? prevLikes + 1 : prevLikes - 1, animate: true });
    const run = next ? likePost(user_id, postId) : removeLike(user_id, postId);
    Promise.resolve(run)
      .then((res: any) => {
        if (res?.error) throw res.error;
      })
      .catch((error) => {
        setLocalLike({ liked: !next, likes: prevLikes, animate: false });
        console.error('Error toggling like:', error);
      });
  };

  const fetchComments = async () => {
    try {
      const comments = await getPostComments(postId);
      setState((prevState) => ({
        ...prevState,
        comments,
        loading: false,
      }));
    } catch (error) {
      console.error('Error fetching comments:', error);
      setState((prevState) => ({
        ...prevState,
        loading: false,
      }));
    }
  };

  const togglePopup = async () => {
    setState((prevState) => ({ ...prevState, isOpen: !prevState.isOpen }));

    if (!state.isOpen) {
      setState((prevState) => ({ ...prevState, loading: true }));
      await fetchComments();
    }
  };

  if (!user_id) {
    return null;
  }
  return (
    <div className="flex flex-row items-center gap-4 px-2">
      <div className="flex flex-row items-center gap-2">
        <button onClick={handleLike} className={animate ? 'pop' : ''}>
          <Heart
            className={`heart-icon h-6 w-6 ${animate ? 'pop' : ''} ${liked ? 'fill-current text-accent' : ''}`}
          />
        </button>
        <p className="font-bold">{likes}</p>
      </div>
      <div className="flex flex-row items-center gap-2">
        <div>
          <Link href={post_link} scroll={false} className="text-foreground">
            <MessageCircle className="max-h-[24px] min-h-[24px] min-w-[24px] max-w-[24px]" />
          </Link>
          <Dialog
            open={state.isOpen}
            onOpenChange={(o) => {
              if (!o) setState((prevState) => ({ ...prevState, isOpen: false }));
            }}
          >
            <DialogContent
              data-no-doubletap
              showClose={false}
              className="max-h-[90%] w-screen gap-0 overflow-hidden rounded-lg p-4 pt-16 md:h-auto md:max-h-[80%] md:max-w-4xl"
            >
              <DialogTitle className="sr-only">Comments</DialogTitle>
              <button
                onClick={() => setState((prevState) => ({ ...prevState, isOpen: false }))}
                className="absolute right-2 top-2 rounded-md bg-accent px-4 py-2 text-white"
              >
                Close
              </button>
              <div className="flex h-3/4 flex-col overflow-y-auto">
                {state.loading ? (
                  <div className="flex h-full items-center justify-center">
                    <span>Loading...</span>
                  </div>
                ) : state.comments?.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <span>No comments yet</span>
                  </div>
                ) : (
                  <div className="flex w-full flex-col gap-2">
                    {state.comments.map((comment: any) => {
                      if (comment.parent_id === null) {
                        return (
                          <div key={comment.id} className="w-full">
                            <CommentCard
                              comment={comment}
                              post={post}
                              user_id={user_id}
                              fetchComments={fetchComments}
                            />
                          </div>
                        );
                      }
                    })}
                  </div>
                )}
              </div>
              <div className="absolute bottom-6 w-11/12">
                <AddComment post={post} user_id={user_id} fetchComments={fetchComments} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="font-bold">{state.commentCount}</p>
      </div>
    </div>
  );
};

export default PostStats;
