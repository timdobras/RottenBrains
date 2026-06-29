// app/components/OAuthButton.tsx
'use client';

import { useState } from 'react';
import { oAuthSignIn } from '@/lib/server/OAuthSignIn';

type SocialProvider = 'google' | 'discord';

type OAuthProvider = {
  name: SocialProvider;
  displayName: string;
  icon: string;
};

export function OAuthButton() {
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null);

  const oAuthProviders: OAuthProvider[] = [
    { name: 'google', displayName: 'Google', icon: '/assets/icons/google.svg' },
    {
      name: 'discord',
      displayName: 'Discord',
      icon: '/assets/icons/discord.svg',
    },
  ];

  const handleSignIn = async (provider: SocialProvider) => {
    setLoadingProvider(provider);
    try {
      // This server action will trigger a redirect.
      await oAuthSignIn(provider);
      // The code below may not be reached because the user is redirected.
    } catch (error) {
      console.error('Error during OAuth sign‑in:', error);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {oAuthProviders.map((provider) => (
        <button
          key={provider.name}
          onClick={() => handleSignIn(provider.name)}
          disabled={loadingProvider === provider.name}
          className="mb-2 flex items-center justify-center gap-4 rounded-md px-4 py-2 text-foreground outline outline-2 outline-accent"
        >
          {provider.icon && (
            <img
              src={provider.icon}
              alt={`${provider.displayName} icon`}
              width={15}
              height={15}
              className="invert-on-dark"
            />
          )}
          <span>
            {loadingProvider === provider.name
              ? 'Redirecting...'
              : `Login with ${provider.displayName}`}
          </span>
        </button>
      ))}
    </div>
  );
}
