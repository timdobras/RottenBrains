"use client";

import React, { useState } from "react";

interface ToggleClampProps {
  text: string;
}

const ToggleClamp: React.FC<ToggleClampProps> = ({ text }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleClamp = () => {
    setIsExpanded((prev) => !prev);
  };

  return (
    <div
      className={`cursor-pointer text-sm opacity-60 ${isExpanded ? "" : "line-clamp-4"} transition-all`}
      onClick={toggleClamp}
    >
      {text}
    </div>
  );
};

export default ToggleClamp;
