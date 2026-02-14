import React from 'react';
import Script from 'next/script';

interface Props {
  domain: string;
  src?: string;
}

const PlausibleAnalytics: React.FC<Props> = ({
  domain,
  src = 'https://plausible.io/js/script.js',
}) => {
  return (
    <>
      <Script strategy="afterInteractive" data-domain={domain} src={src} />
      <Script
        id="plausible-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};plausible.init();`,
        }}
      />
    </>
  );
};

export default PlausibleAnalytics;
