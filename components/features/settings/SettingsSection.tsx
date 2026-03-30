import React from 'react';

const SettingsSection = ({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="mb-6">
      <h2 className="mb-1 text-lg font-semibold">{title}</h2>
      {description && <p className="mb-3 text-sm text-foreground/50">{description}</p>}
      <div className="rounded-lg border border-foreground/10 p-4 md:p-6">{children}</div>
    </div>
  );
};

export default SettingsSection;
