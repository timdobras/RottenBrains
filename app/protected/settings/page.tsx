import React from 'react';
import NavThemeSwitch from '@/components/features/navigation/NavThemeSwitch';
import DefaultSettingsForm from '@/components/features/settings/DefaultSettingsForm';
import SettingsSection from '@/components/features/settings/SettingsSection';

const GeneralSettingsPage = () => {
  return (
    <>
      <SettingsSection title="Theme" description="Choose your preferred appearance">
        <NavThemeSwitch />
      </SettingsSection>
      <SettingsSection title="Defaults" description="Default video provider and playback settings">
        <DefaultSettingsForm />
      </SettingsSection>
    </>
  );
};

export default GeneralSettingsPage;
