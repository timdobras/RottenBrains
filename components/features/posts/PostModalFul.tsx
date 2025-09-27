import React from "react";
import PostModal from "../profile/PostModal";
import CommentSection from "../profile/CommentSection";
import ImageWithFallback from "../media/ImageWithFallback";
import Link from "next/link";
import ProfilePicture from "@/components/ui/ProfilePicture";
import { getImageUrlFromMediaDetails } from "@/lib/server/helperFunctions";
import { getRelativeTime } from "@/lib/utils";

interface PostModalFullProps {
  post_media_data: any;
  user_id: string;
}

const PostModalFull = ({ post_media_data, user_id }: PostModalFullProps) => {
  const { post_data, media_data } = post_media_data ? post_media_data : {};
  return (
    <PostModal userId={user_id} isOpen={true}>
      <div className="flex h-full w-full flex-col md:flex-row md:gap-2">
        <div className="flex h-full flex-col bg-background md:w-[60%]">
          <div className="h-full w-full">
            <div className="flex flex-row items-center justify-between gap-4 px-4 py-2">
              <div className="flex flex-row items-center gap-2">
                <span className="min-h-[32px] min-w-[32px]">
                  <ProfilePicture user={post_data.creator} />
                </span>
                <div className="flex flex-col">
                  <p className="line-clamp-1 font-bold text-accent/80">
                    <Link href={`/protected/user/${post_data.creator.id}}`}>
                      {post_data.creator.username}
                    </Link>
                  </p>
                  <p className="-mt-1 text-xs opacity-50">
                    {getRelativeTime(post_data.post.created_at)}
                  </p>
                </div>
              </div>
            </div>
            <div className="relative w-full">
              <Link
                href={`/protected/media/${media_data.media_type}/${media_data.media_id}`}
                className="w-full"
              >
                <ImageWithFallback
                  imageUrl={getImageUrlFromMediaDetails(media_data)}
                  altText={post_data.post.post_id}
                  quality={"original"}
                />
              </Link>
              <div className="absolute bottom-2 right-2">
                <p className="rounded-[4px] bg-secondary px-2 py-1 text-xs text-white">
                  {post_data.post.vote_user}
                </p>
              </div>
            </div>
            <div className="flex flex-col px-2 md:px-4">
              <div className="flex flex-col gap-2 py-4">
                <div className="flex w-full flex-row gap-2">
                  <img
                    src={`/assets/icons/${media_data.media_type}-outline.svg`}
                    alt=""
                    className="invert-on-dark"
                  />
                  <Link
                    href={`/protected/media/${media_data.media_type}/${media_data.media_id}`}
                    className="line-clamp-1 font-medium"
                  >
                    {media_data && (media_data.title || media_data.name)}
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="h-full max-h-[150px] w-full overflow-y-auto px-2 md:max-h-none md:px-4 md:pb-4">
            <p className="">{post_data.post.review_user}</p>
          </div>
        </div>
        <div className="mt-2 md:mt-8 md:w-[40%] md:p-2">
          <CommentSection
            post_data={post_data}
            current_user={post_data.current_user}
          ></CommentSection>
        </div>
      </div>
    </PostModal>
  );
};

export default PostModalFull;
