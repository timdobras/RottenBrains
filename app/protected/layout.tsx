import React from 'react';

// Auth and premium access are enforced by middleware
const layout = async ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default layout;
