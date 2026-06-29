import { redirect } from 'next/navigation';
import React from 'react';
import IPAddressManager from '@/components/features/settings/IPAddressManager';
import SettingsSection from '@/components/features/settings/SettingsSection';
import { getCurrentUser } from '@/lib/db/queries';

const SecuritySettingsPage = async () => {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  return (
    <SettingsSection
      title="VPN & Security"
      description="Manage your known IP addresses for VPN detection"
    >
      <IPAddressManager userId={user.id} />
    </SettingsSection>
  );
};

export default SecuritySettingsPage;
