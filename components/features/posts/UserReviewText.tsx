'use client';

import classNames from 'classnames';
import Link from 'next/link';
import React from 'react';

interface UserReviewProps {
  post_review: string;
  post_link: string;
  // When true (e.g. inside the post modal / on the post page) the full review is
  // shown and there is no "Show more" link, since the post is already expanded.
  expanded?: boolean;
}

const UserReviewText = ({ post_review, post_link, expanded }: UserReviewProps): React.JSX.Element => {
  if (expanded) {
    return (
      <div className="flex min-h-[70px] flex-col gap-2 text-sm">
        <p className="whitespace-pre-line text-foreground/80">{post_review}</p>
      </div>
    );
  }

  return (
    <Link href={post_link || '/'} scroll={false} className="flex min-h-[70px] flex-col gap-2 text-sm">
      <p className={classNames('line-clamp-2 overflow-hidden text-foreground/70')}>{post_review}</p>
      <p className="text-xs text-foreground/50">Show more</p>
    </Link>
  );
};

export default UserReviewText;
