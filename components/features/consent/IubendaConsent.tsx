import Script from "next/script";

const IubendaScripts = () => {
  return (
    <>
      {/* Inline configuration script; using beforeInteractive ensures it runs early */}
      <Script id="iubenda-config" strategy="beforeInteractive">
        {`
          var _iub = _iub || [];
          _iub.csConfiguration = {
            "siteId": 3926952,
            "cookiePolicyId": 37805153,
            "lang": "en",
            "storage": { "useSiteId": true }
          };
        `}
      </Script>

      {/* External scripts loaded after the page is interactive */}
      <Script
        src="https://cs.iubenda.com/autoblocking/3926952.js"
        strategy="afterInteractive"
      />
      <Script
        src="//cdn.iubenda.com/cs/tcf/stub-v2.js"
        strategy="afterInteractive"
      />
      <Script
        src="//cdn.iubenda.com/cs/tcf/safe-tcf-v2.js"
        strategy="afterInteractive"
      />
      <Script
        src="//cdn.iubenda.com/cs/gpp/stub.js"
        strategy="afterInteractive"
      />
      <Script
        src="//cdn.iubenda.com/cs/iubenda_cs.js"
        strategy="afterInteractive"
        charSet="UTF-8"
        async
      />
    </>
  );
};

export default IubendaScripts;
