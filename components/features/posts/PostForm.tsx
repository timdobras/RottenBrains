"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMediaDetails } from "@/lib/tmdb";
import { useUser } from "@/hooks/UserContext";
import { useToast } from "../../ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { updateGenreStats } from "@/lib/supabase/clientQueries";
import SearchBar from "../search-bar/SearchBar";

type PostFormProps = {
  post?: any;
  from_media?: any;
  action: "Create" | "Update";
};

const PostForm = ({ post, action, from_media }: PostFormProps) => {
  const [media, setMedia] = useState<any | null>(null);

  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  const imageUrl = media?.images?.backdrops?.[0]?.file_path;
  // State to manage input values
  const [formValues, setFormValues] = useState({
    review_user: "Λοιπον είδα το ",
    vote_user: 0,
  });

  // State to manage loading
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMediaDetails = async () => {
      if (action === "Update" && post) {
        const mediaDetails = await getMediaDetails(
          post.media_type,
          post.media_id,
        );
        setMedia(mediaDetails);
      }
    };
    fetchMediaDetails();
  }, [action, post]);

  useEffect(() => {
    const fetchMediaDetails = async () => {
      if (action === "Create" && from_media) {
        const mediaDetails = await getMediaDetails(
          from_media.media_type,
          from_media.media_id,
        );
        setMedia(mediaDetails);
      }
    };
    fetchMediaDetails();
  }, [action, from_media]);

  // Use useEffect to update the review_user when media changes
  useEffect(() => {
    if (action === "Update" && post) {
      setFormValues((prevValues) => ({
        ...prevValues,
        review_user: post.review_user,
        vote_user: post.vote_user,
      }));
    } else {
      if (media) {
        setFormValues((prevValues) => ({
          ...prevValues,
          review_user: `Λοιπον είδα το ${media.title || media.name},`,
        }));
      }
    }
  }, [media]);

  // Function to update the review text based on the rating
  const updateReviewText = (rating: number) => {
    let reviewText = `Λοιπον είδα το ${media?.title || media?.name}, `;
    if (rating >= 8) {
      reviewText += ` καλή`;
    } else if (rating >= 4) {
      reviewText += ` μέτρια`;
    } else {
      reviewText += ` κακή`;
    }
    if (media?.media_type === "movie") {
      reviewText += ` ταινία`;
    } else if (from_media) {
      if (from_media.media_type === "movie") {
        reviewText += ` ταινία`;
      } else {
        reviewText += ` σειρα`;
      }
    } else {
      reviewText += ` σειρα`;
    }
    setFormValues((prevValues) => ({
      ...prevValues,
      review_user: reviewText,
    }));
  };

  // media?.media_type === "movie" ? "ταινία" : "σειρα";

  // Use useEffect to update review_user based on the rating
  useEffect(() => {
    updateReviewText(formValues.vote_user);
  }, [formValues.vote_user]);

  // Handle input change
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormValues({
      ...formValues,
      [name]: value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    let dbvalues: any;
    if (from_media) {
      dbvalues = {
        ...formValues,
        media_id: from_media?.media_id,
        creatorId: user?.id,
        media_type: from_media?.media_type,
      };
    } else {
      dbvalues = {
        ...formValues,
        media_id: media?.id,
        creatorId: user?.id,
        media_type: media?.media_type,
      };
    }

    const supabase = createClient();

    if (post && action === "Update") {
      try {
        // Insert a new row into the 'posts' table
        const { data, error } = await supabase
          .from("posts")
          .update([
            {
              media_id: dbvalues.media_id,
              media_type: dbvalues.media_type,
              creatorid: dbvalues.creatorId,
              vote_user: dbvalues.vote_user,
              review_user: dbvalues.review_user,
            },
          ])
          .eq("id", post.id)
          .select();

        if (error) {
          toast({
            title: error.message,
          });
          console.log(error);
        } else {
          router.push("/");
          toast({
            title: `${action}d Post`,
          });
        }
      } catch (error) {
        console.error("Error inserting data:", error);
      }
    } else {
      try {
        // Insert a new row into the 'posts' table
        const { data, error } = await supabase
          .from("posts")
          .insert([
            {
              media_id: dbvalues.media_id,
              media_type: dbvalues.media_type,
              creatorid: dbvalues.creatorId,
              vote_user: dbvalues.vote_user,
              review_user: dbvalues.review_user,
            },
          ])
          .select();
        if (error) {
          console.log(error);
          toast({
            title: error.message,
          });
        } else {
          try {
            await updateGenreStats({
              genreIds: media.genre_ids,
              mediaType: dbvalues.media_type,
              userId: dbvalues.creatorId,
            });
          } catch (error) {
          } finally {
            router.push("/");
            toast({
              title: `${action}d Post`,
            });
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Error inserting data:", error);
      }
    }
  };

  // Handle post deletion
  const handleDelete = async () => {
    if (!post) return;

    setLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id);

      if (error) {
        console.log(error);
        toast({
          title: error.message,
        });
      } else {
        router.push("/");
        toast({
          title: `Deleted Post`,
        });
      }
    } catch (error) {
      console.error("Error deleting post:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto mt-10 flex w-full max-w-4xl flex-col text-foreground">
      <div className="w-[300px] self-center py-4 md:w-[500px]">
        <p className="py-2 text-center text-lg font-semibold">
          Search for a Movie or TV Show
        </p>
        <SearchBar media={media} setMedia={setMedia}></SearchBar>
      </div>
      <div className="flex flex-col items-center md:flex-row">
        <div className="m-auto h-[450px] w-[300px] overflow-hidden rounded-xl bg-foreground/10 shadow-lg">
          {media?.poster_path && (
            <img
              src={`https://image.tmdb.org/t/p/w500${media?.poster_path}`}
              alt="Poster"
              width="300"
              height="450"
              className="min-h-[450px] min-w-[300px]"
            />
          )}
        </div>
        <div className="mt-6 w-full px-4 md:mt-0 md:w-1/2">
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-6 rounded-lg bg-background p-6 shadow-md"
          >
            {/* Description */}
            <div className="flex flex-col">
              <label className="mb-2 font-medium text-foreground/30">
                Review
              </label>
              <textarea
                name="review_user"
                value={formValues.review_user}
                onChange={handleInputChange}
                placeholder="Write your review here..."
                className="h-40 resize-none rounded border bg-background p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            {/* Rating */}
            <div className="flex flex-col">
              <label className="mb-2 font-medium text-foreground/30">
                Rating
              </label>
              <input
                type="number"
                name="vote_user"
                value={formValues.vote_user}
                onChange={handleInputChange}
                placeholder="Rate from 0 to 10"
                className="rounded border bg-background p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                max={10}
                min={0}
                step={0.1} // Allows decimal values
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="rounded bg-accent/90 py-3 font-bold text-foreground transition duration-300 hover:bg-accent"
              disabled={loading}
            >
              {loading ? "Loading..." : action}
            </button>

            {/* Delete Button */}
            {action === "Update" && (
              <button
                type="button"
                onClick={handleDelete}
                className="mt-2 rounded border-2 border-red-500 py-3 font-bold text-foreground transition duration-300 hover:bg-red-500"
                disabled={loading}
              >
                Delete
              </button>
            )}
          </form>
        </div>
      </div>
      <div className="h-[200px]"></div>
    </div>
  );
};

export default PostForm;
