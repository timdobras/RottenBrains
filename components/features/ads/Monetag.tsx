"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@/hooks/UserContext";

const MonetagAd: React.FC = () => {
  const [adBlocked, setAdBlocked] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    let scriptLoaded = false;

    const timeoutId = setTimeout(() => {
      if (!scriptLoaded) setAdBlocked(true);
    }, 3000);

    const adScript = document.createElement("script");
    adScript.type = "text/javascript";
    adScript.setAttribute("data-cfasync", "false");
    adScript.innerHTML = `(() => { <script>(function(s,u,z,p){s.src=u,s.setAttribute('data-zone',z),p.appendChild(s);})(document.createElement('script'),'https://shebudriftaiter.net/tag.min.js',8939144,document.body||document.documentElement)</script>})();`;

    const fallbackScript = document.createElement("script");
    fallbackScript.type = "text/javascript";
    fallbackScript.innerHTML = `
      (function(d,z,s,c){
        s.src='//offfurreton.com/400/8939142';
        s.onerror=s.onload=E;
        function E(){c&&c();c=null}
        try{(document.body||document.documentElement).appendChild(s)}catch(e){E()}
      })(document, 8939142, document.createElement('script'), _eqtzjm);
    `;

    adScript.onload = () => {
      scriptLoaded = true;
      clearTimeout(timeoutId);
    };

    adScript.onerror = () => {
      setAdBlocked(true);
      clearTimeout(timeoutId);
    };

    const adContainer = document.getElementById("monetag-ad-container");
    if (adContainer) {
      adContainer.appendChild(adScript);
      adContainer.appendChild(fallbackScript);
    }

    return () => clearTimeout(timeoutId);
  }, []);

  if (user?.premium) return null;

  if (adBlocked) {
    return <div className="text-center">Ad blocked or not loaded.</div>;
  }

  return (
    <div id="monetag-ad-container" className="h-[50px] w-full bg-gray-200" />
  );
};

export default MonetagAd;
