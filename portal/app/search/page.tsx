"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { STATES } from "@/lib/constants";
import { fetchDistrictMetrics } from "@/lib/data-loader";
import type { DistrictMetrics } from "@/lib/types/district";
import Breadcrumb from "@/components/ui/Breadcrumb";

export default function SearchDirectoryPage() {
  const router = useRouter();

  // State selection
  const [selectedStateCode, setSelectedStateCode] = useState<string>("GJ");
  const [districtsList, setDistrictsList] = useState<DistrictMetrics[]>([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>("");
  const [loadingDistricts, setLoadingDistricts] = useState<boolean>(false);

  // Search input toggles & queries for state and district
  const [showStateSearch, setShowStateSearch] = useState<boolean>(false);
  const [stateSearchQuery, setStateSearchQuery] = useState<string>("");
  const [showDistrictSearch, setShowDistrictSearch] = useState<boolean>(false);
  const [districtSearchQuery, setDistrictSearchQuery] = useState<string>("");

  const stateInputRef = useRef<HTMLInputElement | null>(null);
  const districtInputRef = useRef<HTMLInputElement | null>(null);

  // Focus inputs when search toggled
  useEffect(() => {
    if (showStateSearch && stateInputRef.current) {
      stateInputRef.current.focus();
    }
  }, [showStateSearch]);

  useEffect(() => {
    if (showDistrictSearch && districtInputRef.current) {
      districtInputRef.current.focus();
    }
  }, [showDistrictSearch]);

  // Load districts when selectedStateCode changes
  useEffect(() => {
    if (!selectedStateCode) {
      setDistrictsList([]);
      setSelectedDistrictId("");
      return;
    }

    let isMounted = true;
    setLoadingDistricts(true);

    fetchDistrictMetrics(selectedStateCode).then((data) => {
      if (isMounted) {
        if (data && data.length > 0) {
          setDistrictsList(data);
          setSelectedDistrictId(data[0].district_id);
        } else {
          setDistrictsList([]);
          setSelectedDistrictId("");
        }
        setLoadingDistricts(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedStateCode]);

  const selectedStateInfo = useMemo(() => {
    return STATES.find((s) => s.code === selectedStateCode);
  }, [selectedStateCode]);

  const filteredStates = useMemo(() => {
    if (!stateSearchQuery.trim()) return STATES;
    const q = stateSearchQuery.toLowerCase();
    return STATES.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [stateSearchQuery]);

  const filteredDistricts = useMemo(() => {
    if (!districtSearchQuery.trim()) return districtsList;
    const q = districtSearchQuery.toLowerCase();
    return districtsList.filter(
      (d) =>
        d.district_name.toLowerCase().includes(q) ||
        d.district_id.toLowerCase().includes(q)
    );
  }, [districtsList, districtSearchQuery]);

  const selectedDistrict = useMemo(() => {
    return districtsList.find((d) => d.district_id === selectedDistrictId);
  }, [districtsList, selectedDistrictId]);

  const handleNavigateToDistrict = () => {
    if (selectedDistrictId) {
      router.push(`/district/${encodeURIComponent(selectedDistrictId)}`);
    }
  };

  const handleNavigateToState = () => {
    if (selectedStateCode) {
      router.push(`/state/${selectedStateCode}`);
    }
  };

  return (
    <div className="flex flex-col flex-1 pb-16">
      {/* Header Bar */}
      <div className="px-4 sm:px-6 lg:px-8 py-3.5 border-b border-[#2D3148] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#141722]/80 flex-shrink-0">
        <div>
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Search & Filter" },
            ]}
          />
          <h1 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <span>District Search & Filter</span>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Manual Filter
            </span>
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Filter by state and district to directly access demographic profiles and AI analytics.
          </p>
        </div>

        {/* Alternative mode shortcut */}
        <div className="flex items-center gap-2">
          <Link
            href="/map"
            className="px-3.5 py-1.5 rounded-xl bg-[#1A1D27] hover:bg-[#242838] border border-[#2D3148] text-xs text-gray-300 hover:text-white font-medium transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Switch to Map Navigation</span>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Main State & District Selector Card */}
        <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Select State & District
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Choose a state and select a specific district to open its data dashboard. Use the search icon to quickly filter by keyword.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. State Selector with Search Icon */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>1. State / Union Territory</span>
                <span className="text-[10px] text-gray-500 font-normal">36 Total</span>
              </label>

              <div className="flex items-center gap-2">
                {/* Dropdown Menu */}
                <select
                  value={selectedStateCode}
                  onChange={(e) => {
                    setSelectedStateCode(e.target.value);
                    setShowStateSearch(false);
                    setStateSearchQuery("");
                  }}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0F1117] border border-[#2D3148] text-white text-xs font-medium focus:border-orange-500 focus:outline-none transition-colors cursor-pointer"
                >
                  {STATES.map((state) => (
                    <option key={state.code} value={state.code} className="bg-[#1A1D27] text-white py-1">
                      {state.name} ({state.code})
                    </option>
                  ))}
                </select>

                {/* Search Icon Button beside Dropdown */}
                <button
                  type="button"
                  onClick={() => {
                    setShowStateSearch(!showStateSearch);
                    if (showStateSearch) setStateSearchQuery("");
                  }}
                  title={showStateSearch ? "Close state search" : "Search state by name"}
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                    showStateSearch
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "bg-[#0F1117] border-[#2D3148] text-gray-400 hover:text-white hover:border-orange-500/50 hover:bg-[#242838]"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>

              {/* State Search Input & Filter Dropdown (Toggled by Search Icon) */}
              {showStateSearch && (
                <div className="p-2.5 rounded-xl bg-[#0F1117] border border-orange-500/40 space-y-2 animate-fade-in shadow-lg">
                  <div className="relative">
                    <input
                      ref={stateInputRef}
                      type="text"
                      placeholder="Type state name..."
                      value={stateSearchQuery}
                      onChange={(e) => setStateSearchQuery(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#1A1D27] border border-[#2D3148] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    />
                    {stateSearchQuery && (
                      <button
                        onClick={() => setStateSearchQuery("")}
                        className="absolute right-2 top-1.5 text-gray-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="max-h-36 overflow-y-auto divide-y divide-[#2D3148] rounded-lg border border-[#2D3148] bg-[#1A1D27]">
                    {filteredStates.length === 0 ? (
                      <div className="p-3 text-center text-gray-500 text-xs">No matching states found</div>
                    ) : (
                      filteredStates.map((s) => (
                        <div
                          key={s.code}
                          onClick={() => {
                            setSelectedStateCode(s.code);
                            setShowStateSearch(false);
                            setStateSearchQuery("");
                          }}
                          className={`px-3 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            selectedStateCode === s.code
                              ? "bg-orange-500/20 text-orange-400 font-semibold"
                              : "text-gray-300 hover:bg-[#242838] hover:text-white"
                          }`}
                        >
                          <span>{s.name}</span>
                          <span className="text-[10px] text-gray-500">{s.code}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. District Selector with Search Icon */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300 flex items-center justify-between">
                <span>2. District in {selectedStateInfo?.name ?? selectedStateCode}</span>
                {loadingDistricts ? (
                  <span className="text-[10px] text-orange-400 animate-pulse">Loading...</span>
                ) : (
                  <span className="text-[10px] text-gray-500 font-normal">
                    {districtsList.length} Available
                  </span>
                )}
              </label>

              <div className="flex items-center gap-2">
                {/* Dropdown Menu */}
                <select
                  value={selectedDistrictId}
                  onChange={(e) => {
                    setSelectedDistrictId(e.target.value);
                    setShowDistrictSearch(false);
                    setDistrictSearchQuery("");
                  }}
                  disabled={loadingDistricts || districtsList.length === 0}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0F1117] border border-[#2D3148] text-white text-xs font-medium focus:border-orange-500 focus:outline-none transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {districtsList.length === 0 ? (
                    <option value="">No districts available</option>
                  ) : (
                    districtsList.map((d) => (
                      <option key={d.district_id} value={d.district_id} className="bg-[#1A1D27] text-white py-1">
                        {d.district_name}
                      </option>
                    ))
                  )}
                </select>

                {/* Search Icon Button beside Dropdown */}
                <button
                  type="button"
                  onClick={() => {
                    setShowDistrictSearch(!showDistrictSearch);
                    if (showDistrictSearch) setDistrictSearchQuery("");
                  }}
                  disabled={loadingDistricts || districtsList.length === 0}
                  title={showDistrictSearch ? "Close district search" : "Search district by name"}
                  className={`p-2.5 rounded-xl border flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer ${
                    showDistrictSearch
                      ? "bg-orange-500 border-orange-500 text-white"
                      : "bg-[#0F1117] border-[#2D3148] text-gray-400 hover:text-white hover:border-orange-500/50 hover:bg-[#242838]"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>

              {/* District Search Input & Filter Dropdown (Toggled by Search Icon) */}
              {showDistrictSearch && (
                <div className="p-2.5 rounded-xl bg-[#0F1117] border border-orange-500/40 space-y-2 animate-fade-in shadow-lg">
                  <div className="relative">
                    <input
                      ref={districtInputRef}
                      type="text"
                      placeholder="Type district name..."
                      value={districtSearchQuery}
                      onChange={(e) => setDistrictSearchQuery(e.target.value)}
                      className="w-full px-3 py-1.5 text-xs bg-[#1A1D27] border border-[#2D3148] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    />
                    {districtSearchQuery && (
                      <button
                        onClick={() => setDistrictSearchQuery("")}
                        className="absolute right-2 top-1.5 text-gray-400 hover:text-white text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="max-h-36 overflow-y-auto divide-y divide-[#2D3148] rounded-lg border border-[#2D3148] bg-[#1A1D27]">
                    {filteredDistricts.length === 0 ? (
                      <div className="p-3 text-center text-gray-500 text-xs">No matching districts found</div>
                    ) : (
                      filteredDistricts.map((d) => (
                        <div
                          key={d.district_id}
                          onClick={() => {
                            setSelectedDistrictId(d.district_id);
                            setShowDistrictSearch(false);
                            setDistrictSearchQuery("");
                          }}
                          className={`px-3 py-1.5 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                            selectedDistrictId === d.district_id
                              ? "bg-orange-500/20 text-orange-400 font-semibold"
                              : "text-gray-300 hover:bg-[#242838] hover:text-white"
                          }`}
                        >
                          <span>{d.district_name}</span>
                          <span className="text-[10px] text-gray-500">{d.district_id}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Preview Card */}
          {selectedDistrict && (
            <div className="p-4 rounded-xl bg-[#0F1117] border border-[#2D3148] space-y-3 animate-fade-in">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {selectedDistrict.district_name}
                  </h4>
                  <p className="text-xs text-orange-400">
                    {selectedDistrict.state_name} ({selectedDistrict.state_code})
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-[#1A1D27] border border-[#2D3148] text-[10px] text-gray-400 font-medium">
                  ID: {selectedDistrict.district_id}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-[#1A1D27] p-2.5 rounded-lg border border-[#2D3148]">
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">Literacy Rate</span>
                  <span className="text-white font-bold text-sm">
                    {selectedDistrict.literacy_rate ? `${selectedDistrict.literacy_rate.toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="bg-[#1A1D27] p-2.5 rounded-lg border border-[#2D3148]">
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">Sex Ratio</span>
                  <span className="text-white font-bold text-sm">
                    {selectedDistrict.sex_ratio ? `${selectedDistrict.sex_ratio} / 1k` : "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation CTA Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <button
              onClick={handleNavigateToDistrict}
              disabled={!selectedDistrictId}
              className="w-full py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/10 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              <span>View Full District Data Page</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>

            <button
              onClick={handleNavigateToState}
              disabled={!selectedStateCode}
              className="w-full py-3 px-4 rounded-xl bg-[#0F1117] hover:bg-[#242838] border border-[#2D3148] text-gray-300 hover:text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Explore {selectedStateInfo?.name ?? selectedStateCode} on State Map</span>
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
