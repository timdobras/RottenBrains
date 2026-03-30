import React from 'react';
import UserSettingsForm from '@/components/features/settings/UserSettingsForm';
import SettingsSection from '@/components/features/settings/SettingsSection';
import { getCurrentUser } from '@/lib/supabase/serverQueries';

const ProfileSettingsPage = async () => {
  const user = await getCurrentUser();

  return (
    <SettingsSection title="Profile" description="Update your display name and profile details">
      <UserSettingsForm user={user} />
    </SettingsSection>
  );
};

export default ProfileSettingsPage;
