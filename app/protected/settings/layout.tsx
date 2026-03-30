import React from 'react';
import SettingsTabs from '@/components/features/settings/SettingsTabs';

const SettingsLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="mx-auto h-full w-full max-w-4xl px-4 pb-64 md:px-0">
      <h1 className="my-4 text-xl font-semibold">Settings</h1>
      <SettingsTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
};

export default SettingsLayout;
