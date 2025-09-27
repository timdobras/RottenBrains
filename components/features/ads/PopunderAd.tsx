"use client";

import React, { useEffect } from "react";

const PopunderAd = () => {
  useEffect(() => {
    // Dynamically load the ad script
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "//pl25670018.profitablecpmrate.com/42/f4/d8/42f4d861820379a160c24822b8239136.js";

    // Append the script to the ad container
    const adContainer = document.getElementById("ad-container-c");
    if (adContainer) {
      adContainer.appendChild(script);
    }

    return () => {
      // Cleanup script on component unmount
      if (adContainer) {
        adContainer.innerHTML = "";
      }
    };
  }, []);

  return (
    <div
      id="ad-container-c"
      style={{
        width: "100%",
        textAlign: "center",
        marginTop: "20px",
      }}
    ></div>
  );
};

export default PopunderAd;
