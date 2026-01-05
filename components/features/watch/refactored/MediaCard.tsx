import Link from 'next/link';
import { getTMDBImageUrl } from '@/lib/mocks/config';

interface Genre {
  id: number;
  name: string;
}

interface Media {
  id: number;
  name?: string;
  title?: string;
  genres: Genre[];
  release_date: string;
  first_air_date?: string;
  poster_path: string;
}

interface MediaCardProps {
  media: Media;
  media_type: string;
}

const MediaCard: React.FC<MediaCardProps> = ({ media, media_type }) => {
  return (
    <Link
      href={`/protected/media/${media_type}/${media.id}`}
      className="flex h-32 w-full flex-row items-center gap-4 overflow-hidden rounded-[8px] bg-foreground/10"
    >
      <img
        src={getTMDBImageUrl(media.poster_path, 'w200') || ''}
        alt={`${media.title || media.name} Poster`}
        className="h-full"
      />
      <div className="flex flex-col gap-2">
        <p className="font-semibold">{media.title || media.name}</p>
        <div className="flew-warp flex flex-row gap-2 text-sm">
          {media.genres.slice(0, 2).map((genre) => (
            <div
              key={genre.id}
              className="rounded-[4px] bg-foreground/10 px-2 py-1 text-foreground/80"
            >
              {genre.name}
            </div>
          ))}
        </div>
        <p className="text-sm text-foreground/50">
          {media_type === 'movie'
            ? media.release_date
              ? media.release_date.slice(0, 4)
              : 0
            : media.first_air_date
            ? media.first_air_date.slice(0, 4)
            : 0}
        </p>
      </div>
    </Link>
  );
};

export default MediaCard;
