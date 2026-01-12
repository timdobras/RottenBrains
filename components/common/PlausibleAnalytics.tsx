'use client';

import React from 'react';

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
      <script defer data-domain={domain} src={src}></script>
      <script>
        {`
          window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
          plausible.init();
        `}
      </script>
    </>
  );
};

export default PlausibleAnalytics;
