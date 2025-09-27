import { fetchBlogPostById } from "@/lib/supabase/serverQueries";
import Link from "next/link";
import React from "react";
import ReactMarkdown from "react-markdown";

type Params = Promise<{ blog_id: string }>;

export default async function AsyncPage({ params }: { params: Params }) {
  // Destructure `blog_id` from `params`

  const { blog_id } = await params;

  // Fetch the blog post by ID
  const data = await fetchBlogPostById(blog_id);

  // Replace escaped newline characters with actual newlines
  data.content = data.content.replace(/\\n/g, "\n");
  const post = data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-4 text-3xl font-bold">{post.title}</h1>
      <div className="mb-6">
        Published on {new Date(post.created_at).toLocaleDateString()}
      </div>
      {post.images && post.images.length > 0 ? (
        <div className="grid aspect-[16/9] w-full grid-cols-4 gap-4 rounded-xl bg-foreground/20 p-4">
          {post.images.map((url: string, idx: number) => (
            <Link
              key={idx}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full w-full"
            >
              <img
                src={url}
                alt={`Blog Image ${idx + 1}`}
                className="aspect-[1/1] h-full w-full rounded-lg object-cover"
              />
            </Link>
          ))}
        </div>
      ) : (
        <img
          src={post.thumbnail}
          alt="Thumbnail"
          className="aspect-[16/9] w-full rounded shadow"
        />
      )}
      {post.features && post.features.length > 0 && (
        <div className="my-6">
          <h2 className="mb-2 text-xl font-bold">Features</h2>
          <ul className="ml-6 list-disc">
            {post.features.map((feature: string, idx: number) => (
              <li key={idx}>{feature}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="prose prose-lg text-foreground">
        <ReactMarkdown>{post.content}</ReactMarkdown>
      </div>
    </div>
  );
}
