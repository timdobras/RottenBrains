"use client";

import Script from "next/script";

export default function MobileBannerExo42() {
  return (
    <>
      {/* Load the ad provider script */}
      <Script
        async
        src="https://a.magsrv.com/ad-provider.js"
        strategy="afterInteractive"
      />

      {/* The ad <ins> element without fixed size */}
      <ins
        className="eas6a97888e42"
        data-zoneid="5540228"
        data-keywords="keywords"
        data-sub="123450000"
      />

      {/* Push the ad after the provider script is loaded */}
      <Script id="magsrv-ad-push-42" strategy="afterInteractive">
        {`
          (AdProvider = window.AdProvider || []).push({"serve": {}});
        `}
      </Script>
    </>
  );
}
