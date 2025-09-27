import PostForm from "@/components/features/posts/PostForm";
import GoBackArrow from "@/components/features/navigation/GoBackArrow";
import React from "react";

type Params = Promise<{ media_id: string; media_type: string }>;

export default async function Page({ params }: { params: Params }) {
  const { media_id } = await params;
  const { media_type } = await params;
  const media = { media_id: media_id, media_type: media_type };
  return (
    <div className="w-screen">
      <div className="relative z-20 flex h-16 w-screen flex-row items-center gap-4 bg-white/10 px-4 md:hidden">
        <GoBackArrow />
        <p className="truncate text-lg">Create post</p>
      </div>
      <PostForm action="Create" from_media={media}></PostForm>
    </div>
  );
}
