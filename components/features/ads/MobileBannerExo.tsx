"use client";

import Script from "next/script";

export default function MobileBannerExo() {
  return (
    <>
      {/* Load the ad provider script */}
      <Script
        async
        src="https://a.magsrv.com/ad-provider.js"
        strategy="afterInteractive"
      />

      {/* The ad <ins> element with fixed width/height */}
      <ins
        className="eas6a97888e2"
        data-zoneid="5540218"
        data-keywords="keywords"
        data-sub="123450000"
      />

      {/* Push the ad after the provider script is loaded */}
      <Script id="magsrv-ad-push" strategy="afterInteractive">
        {`
          (AdProvider = window.AdProvider || []).push({"serve": {}});
        `}
      </Script>
    </>
  );
}
