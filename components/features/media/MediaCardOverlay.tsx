import React, { FC } from "react";
import MediaInfoText from "../watch/MediaInfoText"; // Assuming MediaInfoText is already a component
import ProgressBar from "./ProgressBar"; // Assuming ProgressBar is already a component

interface MediaCardOverlayProps {
  runtime?: number; // Media runtime
  voteAverage?: number; // Media vote average
  quality?: string; // Media quality
  isNew?: boolean; // Whether the media is new
  isSoon?: boolean; // Whether the media is coming soon
  isNewEpisodes?: boolean; // Whether there are new episodes
  watchTime?: number | null; // Watch time percentage for the progress bar
  number_of_episodes?: number;
  transformRuntime: (runtime: number) => string; // Function to transform runtime
}

const MediaCardOverlay: FC<MediaCardOverlayProps> = ({
  runtime,
  voteAverage,
  number_of_episodes,
  quality,
  isNew,
  isSoon,
  isNewEpisodes,
  watchTime = 0,
  transformRuntime,
}) => {
  return (
    <>
      {/* Bottom right media info */}
      <div className="absolute bottom-2 right-2 flex flex-row-reverse gap-2">
        {runtime && <MediaInfoText text={transformRuntime(runtime)} />}
        {number_of_episodes && (
          <MediaInfoText text={`${number_of_episodes} Episodes`} />
        )}
        {/* {typeof voteAverage === "number" && (
          <MediaInfoText text={voteAverage.toFixed(1)} />
        )} */}
        {quality && <MediaInfoText text={quality} />}
      </div>
      {/* Top left tags */}
      <div className="absolute left-0 top-0 m-2">
        {isNew && (
          <div className="rounded-[4px] bg-secondary px-2 py-1 text-xs text-white">
            NEW
          </div>
        )}
        {isSoon && (
          <div className="rounded-[4px] bg-secondary px-2 py-1 text-xs text-white">
            SOON
          </div>
        )}
        {isNewEpisodes && (
          <div className="rounded-[4px] bg-secondary px-2 py-1 text-xs text-white">
            NEW EPISODES
          </div>
        )}
      </div>
      {/* Progress bar */}
      {watchTime != null && watchTime > 0 ? (
        <div className="absolute bottom-0 left-0 h-1 w-full">
          <ProgressBar progress={watchTime} />
        </div>
      ) : (
        <div></div>
      )}
    </>
  );
};

export default MediaCardOverlay;
