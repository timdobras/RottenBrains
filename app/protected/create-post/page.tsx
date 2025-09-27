import PostForm from "@/components/features/posts/PostForm";
import GoBackArrow from "@/components/features/navigation/GoBackArrow";
import React from "react";

const page = () => {
  return (
    <div className="w-full">
      <div className="relative z-20 flex h-16 w-screen flex-row items-center gap-4 bg-background px-4 md:hidden">
        <GoBackArrow />
        <p className="truncate text-lg">Create post</p>
      </div>
      <PostForm action="Create"></PostForm>
    </div>
  );
};

export default page;
