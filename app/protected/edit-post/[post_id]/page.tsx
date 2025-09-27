import PostForm from "@/components/features/posts/PostForm";
import GoBackArrow from "@/components/features/navigation/GoBackArrow";
import React from "react";
import { getPostById } from "@/lib/supabase/serverQueries";

type Params = Promise<{ post_id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { post_id } = await params;

  const post = await getPostById(post_id);

  return (
    <div className="w-screen">
      <div className="relative z-20 flex h-16 w-screen flex-row items-center gap-4 bg-white/10 px-4 md:hidden">
        <GoBackArrow />
        <p className="truncate text-lg">Update post</p>
      </div>
      <PostForm action="Update" post={post}></PostForm>
    </div>
  );
}
