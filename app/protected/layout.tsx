import React from 'react';
import { getCurrentUser } from '@/lib/supabase/serverQueries';

const layout = async ({ children }: { children: React.ReactNode }) => {
  const user = await getCurrentUser();
  return <>{children}</>;
};

export default layout;
