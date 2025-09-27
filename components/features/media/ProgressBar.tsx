import React, { FC } from "react";

interface ProgressBarProps {
  progress: number | null; // Progress percentage (0-100)
  backgroundColor?: string; // Optional: Background color of the progress bar
  progressColor?: string; // Optional: Color of the progress indicator
}

const ProgressBar: FC<ProgressBarProps> = ({
  progress,
  backgroundColor = "bg-white/60",
  progressColor = "bg-accent",
}) => {
  return (
    <div className={`relative h-1 w-full ${backgroundColor}`}>
      <div
        className={`h-full ${progressColor}`}
        style={{ width: `${progress}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;
