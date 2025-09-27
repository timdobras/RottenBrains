import { getMediaDetails } from "@/lib/tmdb";
import React from "react";
import Link from "next/link";

type MediaInfoProps = {
  media_type: string;
  media_id: number;
  season_number?: number;
};

const MediaInfoComponent = async ({
  media_type,
  media_id,
  season_number,
}: MediaInfoProps) => {
  let mediaData;
  try {
    mediaData = await getMediaDetails(media_type, media_id);
  } catch (error) {
    console.error("Error fetching media data:", error);
    mediaData = null;
  }
  const media = mediaData;
  if (!media) {
    return <h1>No Media Found</h1>;
  }
  return (
    <div>
      <div className="flex w-full flex-col items-center gap-2 rounded-xl md:flex-row md:gap-0">
        <Link href={`/protected/media/${media_type}/${media_id}`}>
          <div className="min-h-[450px] min-w-[300px] overflow-hidden rounded-[8px] drop-shadow-2xl">
            <div className="absolute m-2 flex flex-row items-center justify-center gap-2 rounded-[6px] bg-background/50 p-2 text-lg font-bold backdrop-blur">
              <img
                src="/assets/icons/star-solid.svg"
                alt=""
                width={20}
                height={20}
                className="invert-on-dark"
                loading="lazy"
              />
              <p>{media.vote_average.toFixed(1)}</p>
            </div>
            <img
              src={`https://image.tmdb.org/t/p/w500${media.poster_path}`}
              alt=""
              width="300"
              height="450"
            />
          </div>
        </Link>

        {/* <div className="w-full md:h-5/6 bg-foreground/10 md:rounded-r-[8px] relative">
					<div className="flex flex-col p-8 text-foreground/70 gap-2 w-full ">
						<Link
							href={`/protected/media/${media_type}/${media_id}`}
						>
							<p className="text-2xl font-bold py-2 text-foreground">
								{media.title || media.name}{" "}
								<span className="text-foreground/50">
									(
									{(media.release_date &&
										media.release_date.slice(0, 4)) ||
										media.first_air_date.slice(0, 4)}
									)
								</span>
							</p>
						</Link>
						<p className="italic text-foreground/70 text-lg">
							{media.tagline}
						</p>
						<p className="py-2 max-w-[90%]">{media.overview}</p>
						<p>
							Genre:{" "}
							{media.genres
								.map((genre: any) => genre.name)
								.join(", ")}
						</p>
						<div>
							{media.number_of_seasons && (
								<p className="">
									Seasons: {media.number_of_seasons}
								</p>
							)}
						</div>
						<div>
							{media.next_episode_to_air && (
								<div>
									<div className="flex flex-row gap-2 items-center text-xl font-bold py-4">
										<h2 className="">Next Episode:</h2>
										<p>
											{media.next_episode_to_air.air_date}
										</p>
									</div>
								</div>
							)}
						</div>
						<div>
							{media_type === "movie" ? (
								<div>
									<Link
										href={`/protected/watch/${media_type}/${media_id}`}
										className="absolute bottom-0 right-0 m-4 px-4 py-2 bg-accent/80 font-bold rounded-[4px]"
									>
										Watch Now
									</Link>
								</div>
							) : (
								<div>
									<Link
										className="absolute bottom-0 right-0 m-4 px-4 py-2 bg-accent/80 font-bold rounded-[4px]"
										href={`/protected/watch/${media_type}/${media_id}/1/1`}
									>
										Watch Now
									</Link>
								</div>
							)}
						</div>
					</div>
				</div> */}
      </div>
    </div>
  );
};

export default MediaInfoComponent;
