import React from 'react';
import PostForm from '@/components/features/posts/PostForm';
import { getPostById } from '@/lib/supabase/serverQueries';

type Params = Promise<{ post_id: string }>;

export default async function Page({ params }: { params: Params }) {
  const { post_id } = await params;

  const post = await getPostById(post_id);

  return (
    <div className="w-screen">
      <PostForm action="Update" post={post}></PostForm>
    </div>
  );
}
