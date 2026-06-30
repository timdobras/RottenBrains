'use client';

import Link from 'next/link';
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ImageWithFallback from '@/components/features/media/ImageWithFallback';
import MediaCardOverlay from '@/components/features/media/MediaCardOverlay';
import MediaCardHoverPreview, {
  type AnchorRect,
} from '@/components/features/media/MediaCardHoverPreview';
import {
  formatDate,
  formatEpisodeCode,
  getHrefFromMedia,
  getImageUrl,
  transformRuntime,
} from '@/lib/utils';
import { getVideos } from '@/lib/tmdb';
import { queryKeys } from '@/lib/queryKeys';
import MoreOptions from './MoreOptions';
import RemoveFromContinueWatching from './RemoveFromContinueWatching';
import HoverImage, { extractTrailerInfo } from './TrailerDisplayOnHover';
import { useAverageColor } from '@/hooks/useAverageColor';

interface MediaCardProps {
  media: any;
  media_type?: string;
  media_id?: number;
  season_number?: number;
  episode_number?: number;
  watch_time?: number;
  user_id?: string;
  quality?: string;
  rounded?: boolean;
  showRemoveButton?: boolean;
  disableTrailer?: boolean;
  progressive?: boolean;
}

const MediaCardUI: React.FC<MediaCardProps> = ({
  media,
  media_type,
  media_id,
  season_number,
  episode_number,
  watch_time,
  quality,
  user_id,
  rounded,
  showRemoveButton = false,
  disableTrailer = false,
  progressive = true,
}) => {
  season_number = season_number || media.season_number || undefined;
  episode_number = episode_number || media.episode_number || undefined;
  media_type = media_type || media.media_type || undefined;
  media_id = media_id || media.media_id || media.id || undefined;

  watch_time = watch_time || media.watch_time || 0;

  const genreIds: bigint[] = useMemo(
    () => media?.genres?.map((genre: any) => genre.id) || [],
    [media?.genres]
  );

  // Date-based badges - computed client-side only to avoid hydration mismatch
  const releaseDate = media.release_date || media.air_date || media.first_air_date;
  const [dateBadges, setDateBadges] = useState({
    isNew: false,
    isSoon: false,
    isNewEpisodes: false,
  });

  useEffect(() => {
    const now = Date.now();
    const dayDifference = releaseDate
      ? (now - new Date(releaseDate).getTime()) / (1000 * 3600 * 24)
      : undefined;
    const dayDifferenceTv =
      media_type === 'tv' && media.last_air_date
        ? (now - new Date(media.last_air_date).getTime()) / (1000 * 3600 * 24)
        : undefined;

    setDateBadges({
      isNew: dayDifference !== undefined && dayDifference > 0 && dayDifference <= 30,
      isSoon: dayDifference !== undefined && dayDifference < 0,
      isNewEpisodes:
        media_type === 'tv' &&
        dayDifference !== undefined &&
        dayDifference >= 30 &&
        dayDifferenceTv !== undefined &&
        dayDifferenceTv < 30,
    });
  }, [releaseDate, media.last_air_date, media_type]);

  const { isNew, isSoon, isNewEpisodes } = dateBadges;

  const mediaTitle = media.title || media.name;

  const formattedEpisodeCode =
    media_type === 'tv' && season_number && episode_number
      ? ` | ${formatEpisodeCode(season_number, episode_number)}`
      : '';

  // Extract average color from the displayed image (same logic as getImageUrl)
  const colorImagePath =
    media?.images?.backdrops?.[0]?.file_path ||
    (season_number && episode_number ? media.still_path : media.backdrop_path);
  const colorImageUrl = colorImagePath
    ? `https://image.tmdb.org/t/p/w200${colorImagePath}`
    : undefined;
  const mediaColor = useAverageColor(colorImageUrl);

  const href = getHrefFromMedia(
    media_type || 'movie',
    media_id || 0,
    season_number,
    episode_number
  );
  const posterImageUrl = getImageUrl(media, season_number, episode_number);

  // Desktop-only Netflix-style hover pop-out (portal). Disabled on touch /
  // small screens, where the inline tap-to-play trailer is kept instead.
  const queryClient = useQueryClient();
  const [isDesktop, setIsDesktop] = useState(false);
  const [preview, setPreview] = useState<AnchorRect | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelled = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px) and (hover: hover)');
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const usePopout = isDesktop && !disableTrailer;

  const closePreview = useCallback(() => {
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
    setPreview(null);
  }, []);

  const handleAnchorEnter = useCallback(() => {
    cancelled.current = false;
    // Small delay so merely scrolling past a card doesn't trigger the pop-out.
    openTimer.current = setTimeout(async () => {
      if (!posterRef.current) return;
      // Only pop out if the title actually has a trailer. The fetch is cached,
      // so the pop-out reuses it instantly. No trailer → no pop-out.
      let data;
      try {
        data = await queryClient.fetchQuery({
          queryKey: queryKeys.media.videos(media_type || 'movie', media_id || 0),
          queryFn: () => getVideos(media_type || 'movie', media_id || 0),
          staleTime: 1000 * 60 * 60,
        });
      } catch {
        return;
      }
      if (cancelled.current) return; // user left while fetching
      if (!extractTrailerInfo(data)?.url) return; // no trailer
      const el = posterRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setPreview({ top: r.top, left: r.left, width: r.width, height: r.height });
    }, 250);
  }, [queryClient, media_type, media_id]);

  const handleAnchorLeave = useCallback(() => {
    // Cancel a pending open (timer + any in-flight trailer fetch). An already-
    // open pop-out owns its own close via its onMouseLeave.
    cancelled.current = true;
    if (openTimer.current) {
      clearTimeout(openTimer.current);
      openTimer.current = null;
    }
  }, []);

  // Close the pop-out if the row scrolls or the window resizes (anchor moves).
  useEffect(() => {
    if (!preview) return;
    const onMove = () => closePreview();
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [preview, closePreview]);

  useEffect(() => () => closePreview(), [closePreview]);

  const overlayNode = (
    <MediaCardOverlay
      runtime={media.runtime}
      number_of_episodes={media.number_of_episodes}
      voteAverage={media.vote_average}
      isNew={isNew}
      isSoon={isSoon}
      quality={quality}
      isNewEpisodes={isNewEpisodes}
      watchTime={watch_time}
      transformRuntime={transformRuntime}
    />
  );

  return (
    <article className="group relative flex w-full min-w-[70vw] max-w-[100vw] flex-col md:w-full md:min-w-[300px] md:max-w-[512px]">
      <div
        className="pointer-events-none absolute inset-0 scale-100 rounded-[8px] opacity-0 transition-all duration-300 group-hover:scale-[105%] group-hover:opacity-20"
        style={{ backgroundColor: mediaColor }}
        suppressHydrationWarning
      />
      <div
        className="relative"
        ref={posterRef}
        onMouseEnter={usePopout ? handleAnchorEnter : undefined}
        onMouseLeave={usePopout ? handleAnchorLeave : undefined}
      >
        <Link
          className={`relative block w-full overflow-hidden md:rounded-[8px] ${
            rounded === true ? 'rounded-[8px]' : ''
          }`}
          href={href}
        >
          {disableTrailer || usePopout ? (
            // Static poster. On desktop the trailer plays in the hover pop-out;
            // when trailers are disabled it's just the image.
            <div className="relative w-full overflow-hidden">
              <ImageWithFallback
                imageUrl={posterImageUrl}
                altText={mediaTitle}
                quality="w1280"
                progressive={progressive}
              />
              {overlayNode}
            </div>
          ) : (
            <HoverImage
              imageUrl={posterImageUrl}
              altText={mediaTitle}
              media_type={media_type || 'movie'}
              media_id={media_id || 0}
            >
              {overlayNode}
            </HoverImage>
          )}
        </Link>
        {showRemoveButton && user_id && media_type && media_id && (
          <RemoveFromContinueWatching
            user_id={user_id}
            media_type={media_type}
            media_id={media_id}
            season_number={season_number}
            episode_number={episode_number}
          />
        )}
      </div>
      {usePopout && preview && (
        <MediaCardHoverPreview
          href={href}
          imageUrl={posterImageUrl}
          altText={mediaTitle}
          media_type={media_type || 'movie'}
          media_id={media_id || 0}
          anchorRect={preview}
          onClose={closePreview}
        />
      )}
      <div className="flex flex-col md:p-0">
        <div className="mt-2 flex flex-row justify-between">
          <h2 className="text-sm font-semibold">
            {mediaTitle}
            {formattedEpisodeCode}
          </h2>
          {user_id ? (
            <MoreOptions
              user_id={user_id}
              media_type={media.media_type}
              media_id={media.media_id}
              genre_ids={genreIds}
            />
          ) : (
            <></>
          )}
        </div>
        <div className="mt-1 flex flex-row items-center gap-1">
          <span
            key={media_type}
            className="rounded-[4px] bg-foreground/10 px-2 py-[2px] text-xs font-medium text-foreground/70"
          >
            {media_type === 'movie' ? 'Movie' : episode_number ? 'Episode' : 'TV Show'}
          </span>
          {media.genres?.slice(0, 2).map((genre: any) => (
            <Link
              href={`/${media_type}/${genre.id}`}
              key={genre.id}
              className="rounded-[4px] bg-foreground/10 px-2 py-[2px] text-xs font-medium text-foreground/70"
            >
              {genre.name}
            </Link>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-foreground/70">{formatDate(releaseDate)}</p>
      </div>
    </article>
  );
};

export default React.memo(MediaCardUI);
