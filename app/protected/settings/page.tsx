import React from 'react';
import NavThemeSwitch from '@/components/features/navigation/NavThemeSwitch';
import DefaultSettingsForm from '@/components/features/settings/DefaultSettingsForm';
import UserSettingsForm from '@/components/features/settings/UserSettingsForm';
import IPAddressManager from '@/components/features/settings/IPAddressManager';
import { getCurrentUser } from '@/lib/supabase/serverQueries';

const page = async () => {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto h-full w-full max-w-4xl px-4 md:px-0 pb-64">
      <h1 className="my-4 text-xl font-semibold">Settings</h1>
      <NavThemeSwitch></NavThemeSwitch>
      <h1 className="my-4 text-lg font-semibold">Defaults</h1>
      <DefaultSettingsForm></DefaultSettingsForm>
      <h1 className="my-4 text-lg font-semibold">Profile</h1>
      <UserSettingsForm user={user}></UserSettingsForm>
      <h1 className="my-4 text-lg font-semibold">VPN & Security</h1>
      <IPAddressManager userId={user?.id} />
    </div>
  );
};

export default page;
