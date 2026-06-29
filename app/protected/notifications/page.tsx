import { redirect } from 'next/navigation';
import React from 'react';
import Follow from '@/components/features/notifications/FollowCard';
import NotificationButton from '@/components/features/notifications/NotificationButton';
import { fetchUserNotifications } from '@/lib/db/client-actions';
import { getCurrentUser } from '@/lib/db/queries';

const page = async () => {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  // const notifications = await fetchUserNotifications(user.id, 0);
  // console.log(notifications);
  return (
    <div>
      <NotificationButton user_id={user.id}></NotificationButton>
    </div>
  );
};

export default page;
