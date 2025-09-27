import { getCurrentUser } from "@/lib/supabase/serverQueries";
import React from "react";

const layout = async ({ children }: { children: React.ReactNode }) => {
  const user = await getCurrentUser();
  return <>{children}</>;
};

export default layout;
