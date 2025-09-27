"use client";

import Script from "next/script";

export default function MobileBannerExoAlt() {
  return (
    <>
      {/* Load the ad provider script */}
      <Script
        async
        src="https://a.magsrv.com/ad-provider.js"
        strategy="afterInteractive"
      />

      {/* The ad <ins> element without fixed size */}
      <ins className="eas6a97888e14" data-zoneid="5540226" />

      {/* Push the ad after the provider script is loaded */}
      <Script id="magsrv-ad-push-alt" strategy="afterInteractive">
        {`
          (AdProvider = window.AdProvider || []).push({"serve": {}});
        `}
      </Script>
    </>
  );
}
