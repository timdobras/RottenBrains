import React from 'react';
import PostForm from '@/components/features/posts/PostForm';

type Params = Promise<{ media_id: string; media_type: string }>;

export default async function Page({ params }: { params: Params }) {
  const { media_id } = await params;
  const { media_type } = await params;
  const media = { media_id: media_id, media_type: media_type };
  return (
    <div className="w-screen">
      <PostForm action="Create" from_media={media}></PostForm>
    </div>
  );
}
