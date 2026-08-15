"use client";

import dynamic from "next/dynamic";

const StateMap = dynamic(() => import("@/components/map/StateMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#0F1117] text-gray-500 text-sm">
      Loading district map…
    </div>
  ),
});

interface StateMapWrapperProps {
  stateCode: string;
  onDistrictSelect: (district: import("@/lib/types/district").DistrictMetrics | null) => void;
  selectedDistrictId?: string | null;
}

export default function StateMapWrapper(props: StateMapWrapperProps) {
  return (
    <div className="w-full h-full min-h-[500px]">
      <StateMap {...props} />
    </div>
  );
}
