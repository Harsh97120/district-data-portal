"use client";

import dynamic from "next/dynamic";

const IndiaMap = dynamic(() => import("@/components/map/IndiaMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0F1117] text-gray-500 text-sm">
      Loading map…
    </div>
  ),
});

export default function IndiaMapWrapper() {
  return (
    <div className="w-full h-full min-h-[500px]">
      <IndiaMap />
    </div>
  );
}
