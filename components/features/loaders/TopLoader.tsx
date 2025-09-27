"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

const TopLoader = () => {
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (prevPath && prevPath !== pathname) {
      // User started navigating, show loader
      setVisible(true);

      // Simulate loading time (e.g., waiting for page to mount)
      const timer = setTimeout(() => {
        setVisible(false);
      }, 1000); // Adjust timing as needed

      return () => clearTimeout(timer);
    }

    setPrevPath(pathname);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="animate-loading fixed left-0 top-0 z-50 h-[1px] w-full overflow-hidden bg-accent transition-all duration-200"></div>
  );
};

export default TopLoader;
