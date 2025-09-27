import React from "react";
import Link from "next/link";
import UserReviewText from "./UserReviewText";

interface Media {
  id: number;
  title?: string;
  name?: string;
}

interface Creator {
  username: string;
}

interface Post {
  review_user: string;
}

interface PostContentProps {
  media: any;
  post: any;
  post_link: string;
}

const PostContent = ({ media, post, post_link }: PostContentProps) => {
  return (
    <div className="flex flex-col px-2">
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex w-full flex-row items-center gap-2">
          <img
            src={`/assets/icons/${post.media_type}-outline.svg`}
            alt=""
            className="invert-on-dark aspect-square h-5"
          />
          <Link
            href={`/protected/media/${post.media_type}/${post.media_id}`}
            className="line-clamp-1 font-medium"
          >
            {media && (media.title || media.name)}
          </Link>
        </div>
        <UserReviewText
          post_review={post.review_user || "No review"}
          post_link={post_link}
        />
      </div>
    </div>
  );
};

export default PostContent;
