import Follow from "@/components/features/notifications/FollowCard";
import NotificationButton from "@/components/features/notifications/NotificationButton";
import { fetchUserNotifications } from "@/lib/supabase/clientQueries";
import { getCurrentUser } from "@/lib/supabase/serverQueries";
import React from "react";

const page = async () => {
  const user = await getCurrentUser();
  // const notifications = await fetchUserNotifications(user.id, 0);
  // console.log(notifications);
  return (
    <div>
      <NotificationButton user_id={user.id}></NotificationButton>
    </div>
  );
};

export default page;
