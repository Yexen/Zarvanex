'use client';

import dynamic from 'next/dynamic';

// Use dynamic import to avoid SSR issues with Three.js
const GothamMapViewer = dynamic(
  () => import('@/components/gotham/GothamMapViewer'),
  { ssr: false }
);

export default function GothamMapPage() {
  return (
    <div className="h-screen w-screen bg-[#0a0a0a] overflow-hidden">
      <GothamMapViewer />
    </div>
  );
}
