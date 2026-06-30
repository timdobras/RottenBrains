import React from 'react';
import NavThemeSwitch from '@/components/features/navigation/NavThemeSwitch';
import SettingsSection from '@/components/features/settings/SettingsSection';

const GeneralSettingsPage = () => {
  return (
    <>
      <SettingsSection title="Theme" description="Choose your preferred appearance">
        <NavThemeSwitch />
      </SettingsSection>
    </>
  );
};

export default GeneralSettingsPage;
