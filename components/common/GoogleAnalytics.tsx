import Script from "next/script";

type Props = {
  gtag: string;
};

const GoogleAnalytics: React.FC<Props> = ({ gtag }) => {
  return (
    <>
      <Script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${gtag}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gtag}');
          `}
      </Script>
    </>
  );
};

export default GoogleAnalytics;
