import Link from "next/link";
import React from "react";
import { getAverageColor } from "fast-average-color-node";
import ReactMarkdown from "react-markdown";
import { formatDate } from "@/lib/utils";

interface Post {
  id: string; // Adjust based on your data structure
  title: string; // Add other fields as necessary
  thumbnail: string;
  content: string;
  slug: string;
  images: string[];
  features?: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  author_id: string;
}

const PostCardMain: React.FC<{ post: Post }> = async ({ post }) => {
  const randomImage =
    post.images.length > 0
      ? post.images[Math.floor(Math.random() * Math.min(4, post.images.length))]
      : post.thumbnail;

  // Get the average color from the selected image
  const avg_color = await getAverageColor(randomImage);
  post.content = post.content.replace(/\\n/g, "\n");
  return (
    <Link
      href={`/blog/${post.id}`}
      className="w-full min-w-[300px] border md:max-w-[500px]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-2 bg-foreground/20 p-2">
          {post.images.slice(0, 4).map((image, index) => (
            <img
              key={index}
              src={image}
              alt=""
              className="h-full w-full rounded object-cover"
            />
          ))}
        </div>
      </div>
      <div className="bg-black p-4 text-sm font-semibold">
        <p className="">{post.title}</p>
      </div>
      <div className="h-2 w-full" style={{ backgroundColor: avg_color.hex }} />
      <div className="flex w-full flex-col gap-4 p-4">
        <div>
          <p className="text-sm text-foreground/50">
            {formatDate(post.created_at)}
          </p>
        </div>
        <div className="flex flex-row flex-wrap gap-1">
          {post.tags.slice(0, 2).map((tag: string) => (
            <div className="bg-foreground/10 px-2 py-1 text-xs">{tag}</div>
          ))}
        </div>
        <ReactMarkdown className={"line-clamp-5 text-sm"}>
          {post.content}
        </ReactMarkdown>
        <img
          src="/assets/icons/arrow-out-outline.svg"
          alt=""
          className="invert-on-dark ml-auto h-6 w-6"
        />
      </div>
    </Link>
  );
};

export default PostCardMain;
