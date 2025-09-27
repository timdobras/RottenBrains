import React from "react";

const NotificationSkeleton = () => {
  return (
    <div className="flex w-full flex-row gap-4 p-4">
      <div className="aspect-square h-12 rounded-full bg-foreground/10"></div>
      <div className="h-32 w-full"></div>
    </div>
  );
};

export default NotificationSkeleton;
