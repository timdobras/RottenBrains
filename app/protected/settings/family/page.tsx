import { redirect } from 'next/navigation';
import React from 'react';
import FamilySettings from '@/components/features/settings/FamilySettings';
import SettingsSection from '@/components/features/settings/SettingsSection';
import { listUserFamilies } from '@/lib/family/server';
import { getCurrentUser } from '@/lib/supabase/serverQueries';

export const dynamic = 'force-dynamic';

const FamilySettingsPage = async () => {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const families = await listUserFamilies(user.id);

  return (
    <SettingsSection
      title="Family"
      description="Create a family and add people to share your integrations (Jellyfin, and more soon) with everyone in it"
    >
      <FamilySettings userId={user.id} initialFamilies={families} />
    </SettingsSection>
  );
};

export default FamilySettingsPage;
