'use client';

import { useRouter } from 'next/navigation';
import React, { useEffect, useState } from 'react';
import { useUser } from '@/hooks/UserContext';
import { createPost, updatePost, deletePost } from '@/lib/db/mutations';
import { getTMDBImageUrl } from '@/lib/mocks/config';
import { updateGenreStats } from '@/lib/supabase/clientQueries';
import { getMediaDetails } from '@/lib/tmdb';
import { useToast } from '../../ui/use-toast';
import PostContent from './PostContent';
import PostHeader from './PostHeader';
import PostMedia from './PostMedia';

type PostFormProps = {
  post?: any;
  from_media?: any;
  action: 'Create' | 'Update';
};

const PostForm = ({ post, action, from_media }: PostFormProps) => {
  const [media, setMedia] = useState<any | null>(null);

  const { user } = useUser();
  const router = useRouter();
  const { toast } = useToast();

  // State to manage input values
  const [formValues, setFormValues] = useState({
    review_user: 'Λοιπον είδα το ',
    vote_user: 0,
  });

  // Season and image selection state
  const [seasonNumber, setSeasonNumber] = useState<number | null>(null);
  const [selectedImagePath, setSelectedImagePath] = useState<string | null>(null);

  // State to manage loading
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMediaDetails = async () => {
      if (action === 'Update' && post) {
        const mediaDetails = await getMediaDetails(post.media_type, post.media_id);
        setMedia(mediaDetails);
      }
    };
    fetchMediaDetails();
  }, [action, post]);

  useEffect(() => {
    const fetchMediaDetails = async () => {
      if (action === 'Create' && from_media) {
        const mediaDetails = await getMediaDetails(from_media.media_type, from_media.media_id);
        setMedia(mediaDetails);
      }
    };
    fetchMediaDetails();
  }, [action, from_media]);

  // Initialize season and image from post in edit mode
  useEffect(() => {
    if (action === 'Update' && post) {
      setSeasonNumber(post.season_number ?? null);
      setSelectedImagePath(post.image_path ?? null);
    }
  }, [action, post]);

  // Pre-select first backdrop when media loads (only for new posts)
  useEffect(() => {
    if (media?.images?.backdrops?.length > 0) {
      if (action === 'Create' || (action === 'Update' && !post?.image_path)) {
        setSelectedImagePath(media.images.backdrops[0].file_path);
      }
    }
  }, [media]);

  // Use useEffect to update the review_user when media changes
  useEffect(() => {
    if (action === 'Update' && post) {
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

  // Helper to get the season name for review text
  const getSeasonText = (sNum: number | null): string => {
    if (sNum === null) return '';
    const season = media?.seasons?.find((s: any) => s.season_number === sNum);
    if (season) return ` (${season.name})`;
    return ` (Season ${sNum})`;
  };

  // Function to update the review text based on the rating
  const updateReviewText = (rating: number) => {
    const seasonText = getSeasonText(seasonNumber);
    let reviewText = `Λοιπον είδα το ${media?.title || media?.name}${seasonText}, `;
    if (rating >= 8) {
      reviewText += ` καλή`;
    } else if (rating >= 4) {
      reviewText += ` μέτρια`;
    } else {
      reviewText += ` κακή`;
    }
    if (media?.media_type === 'movie') {
      reviewText += ` ταινία`;
    } else if (from_media) {
      if (from_media.media_type === 'movie') {
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

  // Use useEffect to update review_user based on the rating and season
  useEffect(() => {
    if (action !== 'Update') {
      updateReviewText(formValues.vote_user);
    }
  }, [formValues.vote_user, seasonNumber]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    const postPayload = {
      media_id: dbvalues.media_id,
      media_type: dbvalues.media_type,
      vote_user: dbvalues.vote_user,
      review_user: dbvalues.review_user,
      season_number: seasonNumber,
      image_path: selectedImagePath,
    };

    if (post && action === 'Update') {
      try {
        const { error } = await updatePost(post.id, postPayload);

        if (error) {
          toast({ title: error });
          console.log(error);
        } else {
          router.push('/');
          toast({ title: `${action}d Post` });
        }
      } catch (error) {
        console.error('Error inserting data:', error);
      }
    } else {
      try {
        const { error } = await createPost(postPayload);
        if (error) {
          console.log(error);
          toast({ title: error });
        } else {
          try {
            await updateGenreStats({
              genreIds: media.genre_ids,
              mediaType: dbvalues.media_type,
              userId: dbvalues.creatorId,
            });
          } catch (error) {
          } finally {
            router.push('/');
            toast({ title: `${action}d Post` });
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error inserting data:', error);
      }
    }
  };

  // Handle post deletion
  const handleDelete = async () => {
    if (!post) return;

    setLoading(true);

    try {
      const { error } = await deletePost(post.id);

      if (error) {
        console.log(error);
        toast({ title: error });
      } else {
        router.push('/');
        toast({ title: `Deleted Post` });
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    } finally {
      setLoading(false);
    }
  };

  const backdrops = media?.images?.backdrops?.slice(0, 20) || [];
  const mediaType = media?.media_type || from_media?.media_type;
  const seasons = media?.seasons || [];

  // Build preview data that mirrors the real post_data shape
  const previewPost = {
    id: post?.id || 'preview',
    creatorid: user?.id || 0,
    created_at: new Date().toISOString(),
    vote_user: formValues.vote_user,
    post_id: 'preview',
    image_path: selectedImagePath,
    review_user: formValues.review_user,
    media_type: mediaType,
    media_id: from_media?.media_id || media?.id,
    season_number: seasonNumber,
    total_likes: 0,
    total_comments: 0,
  };

  const previewMedia = media
    ? {
        media_type: mediaType,
        media_id: from_media?.media_id || media?.id,
        title: media.title,
        name: media.name,
        images: media.images,
        backdrop_path: media.backdrop_path,
      }
    : null;

  const previewCreator = {
    id: Number(user?.id) || 0,
    email: '',
    image_url: (user as any)?.image_url || '',
    name: (user as any)?.name || '',
    username: (user as any)?.username || 'you',
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-8 px-4 py-6 pb-32 text-foreground md:flex-row md:items-start md:gap-16">
      {/* Live Preview */}
      <div className="flex w-full flex-col items-center gap-3 md:sticky md:top-24 md:min-w-[400px] md:max-w-[450px]">
        <p className="text-sm font-medium text-foreground/40">Preview</p>
        <div className="post_border flex w-full flex-col overflow-hidden rounded-[8px] bg-white/10">
          <PostHeader creator={previewCreator} post={previewPost} />
          {previewMedia && <PostMedia media={previewMedia} post={previewPost} />}
          {previewMedia && (
            <PostContent media={previewMedia} post={previewPost} post_link="#" />
          )}
          {/* Static footer preview */}
          <div className="flex flex-row items-center gap-4 px-2 py-2 text-foreground/40">
            <div className="flex items-center gap-1">
              <img
                src="/assets/icons/heart-outline.svg"
                alt=""
                className="invert-on-dark h-5 w-5 opacity-50"
              />
              <span className="text-xs">0</span>
            </div>
            <div className="flex items-center gap-1">
              <img
                src="/assets/icons/comment-outline.svg"
                alt=""
                className="invert-on-dark h-5 w-5 opacity-50"
              />
              <span className="text-xs">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Form Controls */}
      <div className="w-full max-w-lg">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6"
        >
          {/* Season Selector (TV only) */}
          {mediaType === 'tv' && seasons.length > 0 && (
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-foreground/50">Season</label>
              <select
                value={seasonNumber ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSeasonNumber(val === '' ? null : Number(val));
                }}
                className="rounded-lg border border-foreground/10 bg-foreground/5 p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">Entire Series</option>
                {seasons.map((season: any) => (
                  <option key={season.season_number} value={season.season_number}>
                    {season.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Review */}
          <div className="flex flex-col">
            <label className="mb-2 text-sm font-medium text-foreground/50">Review</label>
            <textarea
              name="review_user"
              value={formValues.review_user}
              onChange={handleInputChange}
              placeholder="Write your review here..."
              className="h-32 resize-none rounded-lg border border-foreground/10 bg-foreground/5 p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          {/* Rating */}
          <div className="flex flex-col">
            <label className="mb-2 text-sm font-medium text-foreground/50">Rating</label>
            <input
              type="number"
              name="vote_user"
              value={formValues.vote_user}
              onChange={handleInputChange}
              placeholder="Rate from 0 to 10"
              className="rounded-lg border border-foreground/10 bg-foreground/5 p-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              max={10}
              min={0}
              step={0.1}
            />
          </div>

          {/* Image Picker */}
          {backdrops.length > 0 && (
            <div className="flex flex-col">
              <label className="mb-2 text-sm font-medium text-foreground/50">Post Image</label>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {backdrops.map((backdrop: any) => (
                  <button
                    key={backdrop.file_path}
                    type="button"
                    onClick={() => setSelectedImagePath(backdrop.file_path)}
                    className={`aspect-video overflow-hidden rounded-lg transition-all ${
                      selectedImagePath === backdrop.file_path
                        ? 'ring-2 ring-accent ring-offset-2 ring-offset-background'
                        : 'opacity-50 hover:opacity-80'
                    }`}
                  >
                    <img
                      src={getTMDBImageUrl(backdrop.file_path, 'w300') || ''}
                      alt="Backdrop option"
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className="rounded-lg bg-accent/90 py-3 font-bold text-foreground transition duration-300 hover:bg-accent"
            disabled={loading}
          >
            {loading ? 'Loading...' : action}
          </button>

          {/* Delete Button */}
          {action === 'Update' && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg border-2 border-red-500 py-3 font-bold text-foreground transition duration-300 hover:bg-red-500"
              disabled={loading}
            >
              Delete
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default PostForm;
