import { redirect } from 'next/navigation';
import React from 'react';
import JellyfinSettings from '@/components/features/settings/JellyfinSettings';
import SettingsSection from '@/components/features/settings/SettingsSection';
import { getCurrentUser } from '@/lib/supabase/serverQueries';

const IntegrationsSettingsPage = async () => {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <SettingsSection
      title="Jellyfin Integration"
      description="Connect your Jellyfin server for media playback"
    >
      <JellyfinSettings userId={user.id} />
    </SettingsSection>
  );
};

export default IntegrationsSettingsPage;
