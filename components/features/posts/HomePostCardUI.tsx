import React from "react";
import PostHeader from "./PostHeader";
import PostMedia from "./PostMedia";
import PostContent from "./PostContent";
import PostFooter from "./PostFooter";

interface HomePostCardProps {
  post_media_data: any;
  user_id?: string;
  rounded?: boolean;
}

const HomePostCardUI = ({
  post_media_data,
  user_id,
  rounded = true,
}: HomePostCardProps) => {
  const { post_data, media_data } = post_media_data;
  const genreIds = media_data?.genres?.map((genre: any) => genre.id) || [];
  const post_link = `/protected/user/${post_data.creator.id}?post_id=${post_data.post.id}`;
  return (
    <div
      className={`relative flex h-min flex-col ${rounded ? "post_border rounded-[8px]" : ""} bg-white/10 md:min-w-[250px] md:max-w-[300px]`}
    >
      <PostHeader
        creator={post_data.creator}
        post={post_data.post}
        user_id={user_id}
      />
      <PostMedia media={media_data} post={post_data.post} />
      <PostContent
        media={media_data}
        post={post_data.post}
        post_link={post_link}
      />
      <PostFooter
        post={post_data.post}
        media={media_data}
        current_user={post_data.current_user}
        user_id={user_id}
        post_link={post_link}
        genreIds={genreIds}
      />
    </div>
  );
};

export default HomePostCardUI;
