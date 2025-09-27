"use client";
import React, { useEffect, useState } from "react";
import { getCommentReplies } from "@/lib/supabase/clientQueries";
import Link from "next/link";
import AddComment from "./AddCommentModal";
import { getRepliesByCommentId } from "@/lib/supabase/serverQueries";
import { getRelativeTime } from "@/lib/utils";

const CommentCard = ({
  comment,
  post,
  user_id,
  fetchComments,
  fetchReplies,
}: any) => {
  const [reply, setReply] = useState(false);
  const [replies, setReplies] = useState<any[]>(comment.replies);
  const creator = comment.commenter;

  useEffect(() => {
    setReplies(comment.replies || []); // Update local replies state when comment updates
  }, [comment.replies]);

  if (!creator) {
    return <p>loading...</p>;
  }

  const handleReplyButton = async () => {
    setReply(!reply);
  };

  return (
    <div className="flex w-full flex-col gap-1 rounded-[8px]">
      <div className="flex w-full flex-row gap-2">
        <img
          src={creator.image_url}
          alt="User avatar"
          className="aspect-square h-8 flex-shrink-0 rounded-full bg-foreground/10"
        />
        <div className="flex w-full flex-col gap-1">
          <div className="flex flex-row items-center gap-2">
            <p className="text-sm">
              <Link href={"/"} className="mr-2 font-medium">
                {creator.username}
              </Link>
              {"  "}
              {comment.content}
            </p>
          </div>
          <div className="flex flex-row gap-2 text-xs text-foreground/50">
            <p>{getRelativeTime(comment.created_at)}</p>
            <button onClick={handleReplyButton}>Reply</button>
          </div>
          <div>
            {reply && (
              <AddComment
                post={post}
                user_id={user_id}
                fetchComments={fetchComments}
                fetchReplies={fetchReplies}
                parent_id={comment.id}
              />
            )}
          </div>
          <div className="flex w-full">
            {replies && replies.length > 0 && (
              <div className="flex w-full flex-col gap-2">
                {replies.map((reply: any) => {
                  return (
                    <CommentCard
                      comment={reply}
                      post={post}
                      user_id={user_id}
                      fetchComments={fetchComments}
                      fetchReplies={fetchReplies}
                    ></CommentCard>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentCard;
