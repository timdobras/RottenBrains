"use client";

import Script from "next/script";

export default function MobileBannerPem() {
  return (
    <>
      {/* Load the ad provider script */}
      <Script
        async
        src="https://a.pemsrv.com/ad-provider.js"
        strategy="afterInteractive"
      />

      {/* The ad <ins> element without fixed size */}
      <ins
        className="eas6a97888e33"
        data-zoneid="5540224"
        data-keywords="keywords"
        data-sub="123450000"
      />

      {/* Push the ad after the provider script is loaded */}
      <Script id="pemsrv-ad-push" strategy="afterInteractive">
        {`
          (AdProvider = window.AdProvider || []).push({"serve": {}});
        `}
      </Script>
    </>
  );
}
