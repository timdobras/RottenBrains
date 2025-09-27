"use client";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const AddComment: React.FC<any> = ({
  post,
  user_id,
  fetchComments,
  parent_id,
}) => {
  const [content, setContent] = useState("");
  const postId = post.id;

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user_id) {
      alert("You must be logged in to comment");
      return;
    }

    const { data, error } = await supabase
      .from("comments")
      .insert([{ post_id: postId, user_id: user_id, content, parent_id }])
      .select();

    const { error: incrementError } = await supabase.rpc("increment_comments", {
      post_id: postId,
    });
    if (incrementError) throw incrementError;

    if (error) {
      console.error(error);
    } else {
      setContent("");
      await fetchComments(); // Fetch comments after adding a new comment
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        className="mb-2 w-full appearance-none rounded-xl bg-foreground/30 p-2 focus:outline-none focus:ring-2 focus:ring-accent"
        placeholder="Add your comment..."
      />
      <button
        type="submit"
        className="w-full rounded-md bg-accent py-2 text-white"
      >
        Add Comment
      </button>
    </form>
  );
};

export default AddComment;
