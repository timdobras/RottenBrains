"use client";
import { useRouter } from "next/navigation";
import React from "react";

const GoBackArrow = () => {
  const router = useRouter();

  return (
    <button onClick={() => router.back()}>
      <img
        src="/assets/icons/arrow-back.svg"
        alt=""
        className="invert-on-dark h-6 w-6"
      ></img>
    </button>
  );
};

export default GoBackArrow;
