"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import CommentCard from "./CommentCardModal";
import { useUser } from "@/hooks/UserContext";
import AddComment from "./AddCommentModal";
import { likePost, removeLike } from "@/lib/client/updatePostData";
import { motion, AnimatePresence, AnimateSharedLayout } from "framer-motion";
import {
  getCommentsByPostId,
  getRepliesByCommentId,
} from "@/lib/supabase/serverQueries";

const cardVariants = {
  hidden: { y: "100%" },
  visible: { y: 0, transition: { duration: 0.2 } },
  exit: { y: "100%", transition: { duration: 0.3 } },
};

const CommentSection = ({ post_data, current_user }: any) => {
  const post = post_data.post;
  const comment_data = post_data.comments;
  const postId = post.id;
  const { user } = useUser();
  const user_id = user.id;
  const [state, setState] = useState({
    liked: current_user.has_liked,
    likes: post.total_likes,
    animate: false,
    isOpen: false,
    comments: comment_data,
    commentCount: post.total_comments || 0,
    loading: false,
    show_comments: false,
  });

  const [viewportDimensions, setViewportDimensions] = useState({
    top: 40,
    height: window.innerHeight,
  });

  const fetchComments = async () => {
    try {
      const comments = await getCommentsByPostId(postId, user_id);
      setState((prevState) => ({
        ...prevState,
        comments,
        loading: false,
      }));
    } catch (error) {
      console.error("Error fetching comments:", error);
      setState((prevState) => ({
        ...prevState,
        loading: false,
      }));
    }
  };

  const fetchReplies = async (commentId: string) => {
    try {
      const replies = await getRepliesByCommentId(commentId, user_id);

      setState((prevState) => {
        const updatedComments = prevState.comments.map((comment: any) => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: replies || [], // Ensuring a new array reference
            };
          }
          return comment;
        });

        return {
          ...prevState,
          comments: [...updatedComments], // Ensure a new reference for the array
        };
      });
    } catch (error) {
      console.error("Error fetching replies:", error);
    }
  };

  useEffect(() => {
    if (!state.show_comments) return;

    const handleViewportChange = () => {
      const visualViewport = window.visualViewport;
      if (visualViewport) {
        setViewportDimensions({
          top: 80,
          height: visualViewport.height - 80,
        });
      }
    };

    const viewport = window.visualViewport;
    if (viewport) {
      viewport.addEventListener("resize", handleViewportChange);
      viewport.addEventListener("scroll", handleViewportChange);
      handleViewportChange(); // Initial calculation
    }
    return () => {
      if (viewport) {
        viewport.removeEventListener("resize", handleViewportChange);
        viewport.removeEventListener("scroll", handleViewportChange);
      }
      // Unlock body scroll
      document.body.classList.remove("overflow-hidden");
    };
  }, [state.show_comments]);

  useEffect(() => {
    if (state.show_comments) {
      document.documentElement.style.overflow = "hidden"; // Prevent scrolling
      document.documentElement.style.position = "fixed"; // Keep position fixed
      document.documentElement.style.width = "100%"; // Ensure full width
      document.body.style.overflow = "hidden"; // Prevent scrolling
      document.body.style.position = "fixed"; // Prevent body scroll
      document.body.style.width = "100%";
    } else {
      document.documentElement.style.overflow = "";
      document.documentElement.style.position = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
    }

    return () => {
      document.documentElement.style.overflow = "";
      document.documentElement.style.position = "";
      document.body.style.overflow = "";
      document.body.style.position = "";
    };
  }, [state.show_comments]);

  // This function is used for the like button
  const handleLike = useCallback(async () => {
    if (user_id) {
      const newLikedState = !state.liked;
      const newLikesCount = newLikedState ? state.likes + 1 : state.likes - 1;

      setState((prevState) => ({
        ...prevState,
        liked: newLikedState,
        likes: newLikesCount,
        animate: true,
      }));

      try {
        if (newLikedState) {
          await likePost(user_id, postId);
        } else {
          await removeLike(user_id, postId);
        }
      } catch (error) {
        setState((prevState) => ({
          ...prevState,
          liked: !newLikedState,
          likes: state.likes,
          animate: false,
        }));
        console.error("Error toggling like:", error);
      }
    }
  }, [state.liked, state.likes, user_id, postId]);

  if (state.loading) {
    return <div>loading</div>;
  }

  return (
    <div className="flex h-full w-full flex-col">
      {/* Desktop Comments Section */}
      <div
        id="comment_card_desktop"
        className="hidden h-full w-full flex-col gap-2 overflow-y-auto md:flex"
      >
        {state.comments ? (
          <>
            {state.comments.map((comment: any) => {
              if (comment.parent_id === null) {
                return (
                  <div key={comment.id} className="w-full">
                    <CommentCard
                      comment={comment}
                      post={post}
                      user_id={user_id}
                      fetchComments={fetchComments}
                      fetchReplies={fetchReplies}
                    />
                  </div>
                );
              }
              return null;
            })}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center">
            <p className="text-lg font-medium">No comments yet</p>
            <p className="text-xs text-foreground/50">
              Start the conversation.
            </p>
          </div>
        )}
      </div>

      <div className="w-full">
        <div className="flex w-full flex-row items-center gap-4 border-t border-foreground/10 bg-background p-4 md:p-2">
          <div className="flex flex-row gap-2">
            <button onClick={handleLike} className={state.animate ? "pop" : ""}>
              {state.liked ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  height="24px"
                  viewBox="0 -960 960 960"
                  width="24px"
                  fill="0000000"
                  className={`heart-icon ${
                    state.animate ? "pop" : ""
                  } fill-accent`}
                >
                  <path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z" />
                </svg>
              ) : (
                <img
                  src={"/assets/icons/heart-outline.svg"}
                  alt="Not Liked"
                  width="24px"
                  height="24px"
                  className={`heart-icon invert-on-dark ${
                    state.animate ? "pop" : ""
                  }`}
                />
              )}
            </button>
            <p className="font-bold">{state.likes}</p>
          </div>
          <div className="flex flex-row gap-2 md:hidden">
            <button
              onClick={() =>
                setState((prevState) => ({
                  ...prevState,
                  show_comments: true,
                }))
              }
              className="text-foreground"
            >
              <img
                src="/assets/icons/comment-outline.svg"
                alt="Comment"
                width={24}
                height={24}
                className="invert-on-dark max-h-[24px] min-h-[24px] min-w-[24px] max-w-[24px]"
              />
            </button>
            <p className="font-bold">{state.commentCount}</p>
          </div>
        </div>
        {/* Desktop comment input */}
        <div className="hidden w-full md:flex">
          <AddComment
            post={post}
            user_id={user_id}
            fetchComments={fetchComments}
            fetchReplies={fetchReplies}
          />
        </div>
        {/* Mobile Comments Modal */}
        <AnimatePresence>
          {state.show_comments && (
            <motion.div
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed left-0 z-50 flex w-full flex-col rounded-[16px] bg-background text-foreground"
              style={{
                top: `${viewportDimensions.top}px`,
                height: `${viewportDimensions.height}px`,
              }}
            >
              <div className="flex w-full flex-row items-center justify-between border-b border-foreground/20">
                <h2 className="p-4 text-lg font-semibold">Comments</h2>
                <button
                  className="aspect-square h-12 text-2xl font-medium text-foreground"
                  onClick={() =>
                    setState((prevState) => ({
                      ...prevState,
                      show_comments: false,
                    }))
                  }
                >
                  <p>&times;</p>
                </button>
              </div>
              {state.comments ? (
                <div className="flex h-full w-full flex-col gap-2 overflow-y-auto p-2">
                  {state.comments.map((comment: any) => {
                    if (comment.parent_id === null) {
                      return (
                        <div key={comment.id} className="w-full">
                          <CommentCard
                            comment={comment}
                            post={post}
                            user_id={user_id}
                            fetchComments={fetchComments}
                            fetchReplies={fetchReplies}
                          />
                        </div>
                      );
                    }
                  })}
                </div>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center">
                  <p className="text-lg font-medium">No comments yet</p>
                  <p className="text-xs text-foreground/50">
                    Start the conversation.
                  </p>
                </div>
              )}
              <div className="w-full">
                <AddComment
                  post={post}
                  user_id={user_id}
                  fetchComments={fetchComments}
                  fetchReplies={fetchReplies}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CommentSection;
