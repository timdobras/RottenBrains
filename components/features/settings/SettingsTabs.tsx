'use client';

import { Tab } from '@/components/features/profile/Tab';

const tabs = [
  { name: 'General', link: '/protected/settings' },
  { name: 'Profile', link: '/protected/settings/profile' },
  { name: 'Integrations', link: '/protected/settings/integrations' },
  { name: 'Family', link: '/protected/settings/family' },
  { name: 'Security', link: '/protected/settings/security' },
];

const SettingsTabs = () => {
  return (
    <div className="flex w-full flex-row overflow-x-auto whitespace-nowrap">
      {tabs.map((tab) => (
        <Tab key={tab.link} name={tab.name} link={tab.link} />
      ))}
      <div className="h-12 w-full border-b border-foreground/10 px-4 py-2"></div>
    </div>
  );
};

export default SettingsTabs;
