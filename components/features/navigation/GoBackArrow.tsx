'use client';
import { useRouter } from 'next/navigation';
import React from 'react';
import { ArrowLeft } from 'lucide-react';

const GoBackArrow = () => {
  const router = useRouter();

  return (
    <button onClick={() => router.back()}>
      <ArrowLeft className="h-6 w-6" />
    </button>
  );
};

export default GoBackArrow;
