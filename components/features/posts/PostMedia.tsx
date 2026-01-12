import Link from 'next/link';
import React from 'react';
import { getImageUrlFromMediaDetails } from '@/lib/server/helperFunctions';
import ImageWithFallback from '../media/ImageWithFallback';

interface Post {
  vote_user: number;
  post_id: string;
}

interface PostMediaProps {
  media: any;
  post: Post;
  quality?: string;
}

const PostMedia = ({ media, post, quality }: PostMediaProps) => {
  return (
    <div className="relative w-full">
      <Link href={`/protected/media/${media.media_type}/${media.media_id}`} className="w-full">
        <ImageWithFallback
          imageUrl={getImageUrlFromMediaDetails(media)}
          altText={post.post_id}
          quality={quality}
        />
      </Link>
      <div className="absolute bottom-2 right-2">
        <p className="rounded-[4px] bg-secondary px-2 py-1 text-xs text-white">{post.vote_user}</p>
      </div>
    </div>
  );
};

export default React.memo(PostMedia);
