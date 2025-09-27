"use client";
import { useUser } from "@/hooks/UserContext";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const AddComment: React.FC<any> = ({
  post,
  user_id,
  fetchComments,
  fetchReplies,
  parent_id,
}) => {
  const [content, setContent] = useState("");
  const postId = post.id;
  const { user } = useUser();

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

      if (parent_id) {
        await fetchReplies(parent_id); // Fetch replies when a reply is added
      } else {
        await fetchComments(); // Fetch comments when a new top-level comment is added
      }
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="md:text-s4 flex w-full flex-row items-center gap-2 border-t border-foreground/10 bg-background px-2"
    >
      <img
        src={user.image_url}
        alt="prof_picture"
        className="aspect-square h-8 rounded-full"
      />
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        className="w-full appearance-none bg-background py-4 text-foreground focus:outline-none md:p-2"
        placeholder="Add comment..."
      />
      <button
        type="submit"
        className="bg-background font-medium text-foreground/50 hover:text-primary md:px-2"
      >
        Post
      </button>
    </form>
  );
};

export default AddComment;
