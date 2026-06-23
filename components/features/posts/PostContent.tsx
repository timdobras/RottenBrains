import Link from 'next/link';
import React from 'react';
import UserReviewText from './UserReviewText';

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
  expanded?: boolean;
}

const PostContent = ({ media, post, post_link, expanded }: PostContentProps) => {
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
            {post.media_type === 'tv' && (
              <span className="text-foreground/50">
                {' · '}
                {post.season_number == null
                  ? 'Full Series'
                  : post.season_number === 0
                    ? 'Specials'
                    : `Season ${post.season_number}`}
              </span>
            )}
          </Link>
        </div>
        <UserReviewText
          post_review={post.review_user || 'No review'}
          post_link={post_link}
          expanded={expanded}
        />
      </div>
    </div>
  );
};

export default React.memo(PostContent);
