// components/AdComponent.tsx

"use client";

import Script from "next/script";

export default function AdComponent() {
  return (
    <>
      {/* The async script for loading the ad provider */}
      <Script
        async
        src="https://a.magsrv.com/ad-provider.js"
        strategy="afterInteractive"
      />

      {/* The ad <ins> element itself */}
      <ins
        className="eas6a97888e2"
        data-zoneid="5540218"
        data-keywords="keywords"
        data-sub="123450000"
      />

      {/* Push the ad after the provider script is loaded */}
      <Script id="magsrv-ad" strategy="afterInteractive">
        {`(AdProvider = window.AdProvider || []).push({"serve": {}});`}
      </Script>
    </>
  );
}
