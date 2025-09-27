import Link from "next/link";
import React from "react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

const ExploreCard = async (media: any) => {
  media = media.media;
  let media_type: string;
  if ("title" in media) {
    media_type = "movie";
  } else {
    media_type = "tv";
  }

  const watchLink =
    media_type === "movie"
      ? `/protected/watch/${media_type}/${media.id}`
      : `/protected/watch/${media_type}/${media.id}/1/1`;

  return (
    <>
      {!media ? (
        <>
          <Skeleton height={300} baseColor="#d1d5db" highlightColor="#e5e7eb" />
          <div className="hidden w-full flex-row justify-between md:flex md:gap-2">
            <Skeleton
              width={50}
              height={20}
              baseColor="#d1d5db"
              highlightColor="#e5e7eb"
            />
            <Skeleton
              width={50}
              height={20}
              baseColor="#d1d5db"
              highlightColor="#e5e7eb"
            />
          </div>
          <Skeleton
            width={`100%`}
            height={20}
            baseColor="#d1d5db"
            highlightColor="#e5e7eb"
          />
          <Skeleton height={40} baseColor="#d1d5db" highlightColor="#e5e7eb" />
        </>
      ) : (
        <>
          <Link
            href={`/protected/media/${media_type}/${media.id}`}
            className="relative aspect-[2/3] min-w-[200px] rounded-[8px] border-2 border-transparent transition ease-in-out hover:z-20 hover:border-foreground hover:drop-shadow-xl"
          >
            <div className="aspect-h-3 aspect-w-2 overflow-hidden rounded-[8px]">
              <picture>
                <img
                  src={`https://image.tmdb.org/t/p/w200${media.poster_path}`}
                  alt=""
                  className="h-full w-full bg-background"
                  loading="lazy"
                />
              </picture>
            </div>
            <div className="absolute bottom-0 left-0 w-full p-1 md:p-2">
              <div className="flex w-full flex-row justify-between md:gap-2">
                <div className="flex flex-row items-center justify-center gap-1 rounded-[7px] bg-black/20 px-2 py-1 text-sm font-bold text-white backdrop-blur-xl md:rounded-[6px]">
                  <img
                    src="/assets/icons/star-solid.svg"
                    alt=""
                    width={10}
                    height={10}
                    className="invert"
                  />
                  {media.vote_average.toFixed(1)}
                </div>
                <div className="flex flex-row items-center justify-center gap-1 rounded-[7px] bg-black/20 px-2 py-1 text-sm font-bold text-white backdrop-blur-xl md:rounded-[6px]">
                  {media.release_date
                    ? media.release_date.slice(0, 4)
                    : media.first_air_date && media.first_air_date.slice(0, 4)}
                </div>
              </div>
            </div>
          </Link>
          {/* <div className="px-1 flex flex-row gap-2 justify-between w-[100%] h-auto items-center">
							<p className="font-bold truncate md:text-lg text-md">
								{media.title || media.name}
							</p>
						</div> */}
          {/* <div className="flex items-center justify-center w-full">
							<Link href={watchLink} className="w-full">
								<div className="px-4 py-2 bg-foreground/10 rounded-md w-full flex items-center justify-center flex-row gap-4 font-bold hover:bg-accent">
									<img
										src="/assets/icons/play-solid.svg"
										alt=""
										width={10}
										height={10}
										className="invert-on-dark"
									/>
									<p>Watch</p>
								</div>
							</Link>
						</div> */}
        </>
      )}
    </>
  );
};

export default ExploreCard;
