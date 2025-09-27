import React from "react";
import Link from "next/link";
import ProfilePicture from "../../ui/ProfilePicture";
import { getRelativeTime } from "@/lib/utils";

interface Creator {
  id: number;
  email: string;
  image_url: string;
  name: string;
  username: string;
}

interface Post {
  id: string;
  creatorid: number;
  created_at: string;
}

interface PostHeaderProps {
  creator: Creator;
  post: Post;
  user_id?: string;
}

const PostHeader = ({ creator, post, user_id }: PostHeaderProps) => {
  return (
    <div className="flex flex-row items-center justify-between gap-4 px-2 py-2">
      <div className="flex flex-row items-center gap-2">
        <span className="min-h-[32px] min-w-[32px]">
          <ProfilePicture user={creator} />
        </span>
        <div className="flex flex-col">
          <p className="line-clamp-1 text-sm font-bold text-accent/80">
            <Link href={`/protected/user/${creator.id}`}>
              {creator.username}
            </Link>
          </p>
          <p className="-mt-1 text-[10px] opacity-50">
            {getRelativeTime(post.created_at)}
          </p>
        </div>
      </div>
      <div className="flex h-full flex-row items-center gap-2">
        {creator.id.toString() === user_id && (
          <Link href={`/protected/edit-post/${post.id}`}>
            <img
              src="/assets/icons/ellipsis-solid.svg"
              alt=""
              width={20}
              height={20}
              className="invert-on-dark mr-2 min-h-[20px] min-w-[20px] justify-self-end"
            />
          </Link>
        )}
      </div>
    </div>
  );
};

export default PostHeader;
