"use client";

import Script from "next/script";

export default function VideoAd() {
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
        className="eas6a97888e20"
        data-zoneid="5540234"
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
