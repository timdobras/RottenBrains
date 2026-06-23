import React from 'react';
import PostContent from './PostContent';
import PostFooter from './PostFooter';
import PostHeader from './PostHeader';
import PostMedia from './PostMedia';
import SeedPostData from './SeedPostData';

interface HomePostCardProps {
  post_media_data: any;
  user_id?: string;
  rounded?: boolean;
  variant?: 'grid' | 'feed';
}

const HomePostCardUI = ({ post_media_data, user_id, rounded = true, variant = 'grid' }: HomePostCardProps) => {
  const { post_data, media_data } = post_media_data;
  const genreIds = media_data?.genres?.map((genre: any) => genre.id) || [];
  // Opens the intercepting post modal (app/protected/@modal/(.)post/[post_id]).
  // The card seeds its already-loaded data so the modal reuses it instead of refetching.
  const post_link = `/protected/post/${post_data.post.id}`;
  const sizeClasses = variant === 'feed' ? 'w-full' : 'md:min-w-[250px] md:max-w-[300px]';
  return (
    <div
      className={`relative flex h-min flex-col ${rounded ? 'post_border rounded-[8px]' : ''} bg-white/10 ${sizeClasses}`}
    >
      <SeedPostData id={post_data.post.id} data={post_media_data} />
      <PostHeader creator={post_data.creator} post={post_data.post} user_id={user_id} />
      <PostMedia media={media_data} post={post_data.post} />
      <PostContent media={media_data} post={post_data.post} post_link={post_link} />
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

export default React.memo(HomePostCardUI);
