'use client';

import React from 'react';

interface Props {
  domain: string;
  src?: string;
}

const PlausibleAnalytics: React.FC<Props> = ({ domain, src = 'https://plausible.io/js/script.js' }) => {
  return (
    <>
      <script defer data-domain={domain} src={src}></script>
    </>
  );
};

export default PlausibleAnalytics;
