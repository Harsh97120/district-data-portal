"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/AuthContext";
import { UserAvatar } from "@/components/layout/UserAccountMenu";
import type { ActivityItem } from "@/lib/models/activity";

type FilterType = "all" | "indicators" | "districts" | "comparisons" | "ai";

function formatActivityTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 60) return "Just now";
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? "minute" : "minutes"} ago`;

  const isToday =
    now.getDate() === date.getDate() &&
    now.getMonth() === date.getMonth() &&
    now.getFullYear() === date.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    yesterday.getDate() === date.getDate() &&
    yesterday.getMonth() === date.getMonth() &&
    yesterday.getFullYear() === date.getFullYear();

  const timeStr = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });

  if (isToday) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;

  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) + ` · ${timeStr}`;
}

export default function ActivityPage() {
  const { user, loading: authLoading, openAuthModal } = useAuth();

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Filters & Search
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Clear confirmation modal
  const [showClearModal, setShowClearModal] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Fetch activities
  const fetchActivities = useCallback(
    async (type: FilterType, search: string, skip = 0, append = false) => {
      if (!user) return;
      if (!append) setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        params.set("type", type);
        if (search) params.set("search", search);
        params.set("limit", "25");
        params.set("skip", String(skip));

        const res = await fetch(`/api/activity?${params.toString()}`);
        if (!res.ok) {
          throw new Error("Unable to load your activity.");
        }

        const data = await res.json();
        if (append) {
          setActivities((prev) => [...prev, ...data.activities]);
        } else {
          setActivities(data.activities || []);
        }
        setTotalCount(data.totalCount || 0);
        setHasMore(Boolean(data.hasMore));
      } catch (err: any) {
        setError(err.message || "Failed to load activities.");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [user]
  );

  // Initial and reactive fetch
  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        fetchActivities(activeFilter, searchQuery, 0, false);
      }, 150);
      return () => clearTimeout(timer);
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, activeFilter, searchQuery, fetchActivities]);

  // Handle Load More
  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchActivities(activeFilter, searchQuery, activities.length, true);
  };

  // Handle Clear Activity
  const handleClearHistory = async () => {
    setIsClearing(true);
    try {
      const res = await fetch("/api/activity", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear activity.");
      setActivities([]);
      setTotalCount(0);
      setHasMore(false);
      setShowClearModal(false);
    } catch {
      alert("Unable to clear activity history. Please try again.");
    } finally {
      setIsClearing(false);
    }
  };

  // Auth Loading Skeleton
  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-6 animate-pulse">
        <div className="h-10 bg-[#1A1D27] rounded-xl w-48" />
        <div className="h-24 bg-[#1A1D27] rounded-2xl w-full" />
        <div className="h-64 bg-[#1A1D27] rounded-2xl w-full" />
      </div>
    );
  }

  // Unauthenticated Guard
  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto text-2xl font-black shadow-lg">
          🔒
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Authentication Required
          </h1>
          <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
            Please sign in to view and manage your personal India District Portal activity history.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openAuthModal("login")}
          className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-sm transition-all shadow-lg shadow-orange-500/25 cursor-pointer inline-flex items-center gap-2"
        >
          <span>Sign In to Continue</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </div>
    );
  }

  const displayName =
    user.name ||
    (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "") ||
    (user.username ? `@${user.username}` : "") ||
    user.email.split("@")[0] ||
    "User";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 pb-16 space-y-8 animate-fade-in text-gray-200">
      {/* ── Page Header & User Identity ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2D3148] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Activity
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Your recent activity on India District Portal
          </p>
        </div>

        {/* User Identity & Clear Action */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#0F1117] border border-[#2D3148]">
            <UserAvatar user={user} size="sm" />
            <div className="text-left leading-tight">
              <span className="text-xs font-bold text-white block truncate max-w-[120px]">
                {displayName}
              </span>
              {user.username && (
                <span className="text-[10px] text-orange-400 font-mono block">
                  @{user.username}
                </span>
              )}
            </div>
          </div>

          {totalCount > 0 && (
            <button
              type="button"
              onClick={() => setShowClearModal(true)}
              className="px-3 py-2 rounded-xl bg-[#0F1117] hover:bg-rose-500/10 text-gray-400 hover:text-rose-400 border border-[#2D3148] hover:border-rose-500/30 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              title="Clear all saved activity history"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Filters & Search Control Bar ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {(
            [
              { id: "all", label: "All" },
              { id: "indicators", label: "Indicators" },
              { id: "districts", label: "Districts" },
              { id: "comparisons", label: "Comparisons" },
              { id: "ai", label: "AI Queries" },
            ] as const
          ).map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-shrink-0 ${
                  isActive
                    ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-sm"
                    : "bg-[#0F1117] text-gray-400 hover:text-white border border-[#2D3148]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity..."
            className="w-full bg-[#0F1117] text-white text-xs pl-8 pr-7 py-2 rounded-xl border border-[#2D3148] focus:border-orange-500 focus:outline-none transition-all placeholder:text-gray-500 shadow-inner"
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-gray-500">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-gray-400 hover:text-white text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Activity Content Area ───────────────────────────────────────────── */}
      {loading ? (
        /* Subtle Loading Skeleton */
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[#1A1D27]/60 border border-[#2D3148] h-18 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
          <p className="text-sm font-bold text-rose-400">{error}</p>
          <button
            type="button"
            onClick={() => fetchActivities(activeFilter, searchQuery, 0, false)}
            className="px-4 py-2 rounded-xl bg-[#1A1D27] hover:bg-[#2D3148] text-white text-xs font-semibold border border-[#2D3148] transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : activities.length === 0 ? (
        /* Empty State */
        <div className="p-10 rounded-2xl bg-[#0F1117]/60 border border-dashed border-[#2D3148] text-center space-y-5 shadow-inner">
          <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto text-xl font-black">
            ✦
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">No activity yet</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your district searches, indicator views, comparisons, and AI interactions will appear here.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20"
            >
              Explore Districts
            </Link>
            <Link
              href="/search"
              className="px-4 py-2 rounded-xl bg-[#1A1D27] hover:bg-[#2D3148] text-gray-200 hover:text-white text-xs font-bold border border-[#2D3148] transition-all"
            >
              Search Indicators
            </Link>
          </div>
        </div>
      ) : (
        /* Activity List */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            <span>Recent Activity ({totalCount})</span>
            <span>Sorted by Newest</span>
          </div>

          <div className="divide-y divide-[#2D3148]/60 bg-[#0F1117]/80 border border-[#2D3148] rounded-2xl overflow-hidden shadow-lg">
            {activities.map((item) => {
              const formattedTime = formatActivityTimestamp(item.createdAt);

              return (
                <Link
                  key={item.id}
                  href={item.targetUrl}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-[#1A1D27]/80 transition-colors group cursor-pointer"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    {/* Action Icon Badge */}
                    <div className="shrink-0 mt-0.5 sm:mt-0">
                      {item.actionType === "INDICATOR_VIEW" && (
                        <div className="w-9 h-9 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center text-sm shadow-sm">
                          📊
                        </div>
                      )}
                      {item.actionType === "DISTRICT_VIEW" && (
                        <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center text-sm shadow-sm">
                          🏛️
                        </div>
                      )}
                      {item.actionType === "DISTRICT_COMPARISON" && (
                        <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center justify-center text-sm shadow-sm">
                          ⚖️
                        </div>
                      )}
                      {item.actionType === "AI_QUERY" && (
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-sm font-black shadow-sm">
                          ✦
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      {item.actionType === "INDICATOR_VIEW" && (
                        <>
                          <h4 className="text-sm font-bold text-white tracking-tight group-hover:text-orange-400 transition-colors truncate">
                            {item.indicatorLabel || item.indicatorId}
                          </h4>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {item.districtName}, {item.stateName} &bull;{" "}
                            <span className="text-gray-500">{item.dataset || "NFHS-6"}</span>
                          </p>
                        </>
                      )}

                      {item.actionType === "DISTRICT_VIEW" && (
                        <>
                          <h4 className="text-sm font-bold text-white tracking-tight group-hover:text-sky-400 transition-colors truncate">
                            {item.districtName}
                          </h4>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {item.stateName} &bull;{" "}
                            <span className="text-gray-500">District Dashboard</span>
                          </p>
                        </>
                      )}

                      {item.actionType === "DISTRICT_COMPARISON" && (
                        <>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-orange-400">
                              {item.districtName}
                            </span>
                            <span className="text-xs text-gray-500 font-bold">↔</span>
                            <span className="text-sm font-bold text-sky-400">
                              {item.comparisonDistrictName}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {item.comparisonStateName && item.comparisonStateName !== item.stateName
                              ? `${item.stateName} ↔ ${item.comparisonStateName}`
                              : item.stateName}{" "}
                            &bull; {item.indicatorLabel || item.indicatorId} &bull;{" "}
                            <span className="text-gray-500">{item.dataset || "NFHS-6"}</span>
                          </p>
                        </>
                      )}

                      {item.actionType === "AI_QUERY" && (
                        <>
                          <h4 className="text-sm font-semibold text-white group-hover:text-emerald-400 transition-colors line-clamp-1 italic">
                            &ldquo;{item.query}&rdquo;
                          </h4>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            AI Inquiry &bull; {item.districtName}, {item.stateName}
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Timestamp & Arrow Link */}
                  <div className="shrink-0 flex items-center gap-3">
                    <span className="text-[11px] font-medium text-gray-400 tabular-nums">
                      {formattedTime}
                    </span>
                    <div className="w-7 h-7 rounded-lg bg-[#1A1D27] border border-[#2D3148] group-hover:border-orange-500/40 text-gray-400 group-hover:text-white flex items-center justify-center transition-all">
                      <svg className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-4 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-5 py-2.5 rounded-xl bg-[#0F1117] hover:bg-[#1A1D27] text-xs font-bold text-gray-300 hover:text-white border border-[#2D3148] transition-all cursor-pointer shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <span>Loading more...</span>
                  </>
                ) : (
                  <span>Load More Activities</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Clear History Confirmation Modal ───────────────────────────────── */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#161822] border border-[#2D3148] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center text-xl font-bold">
              ⚠️
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white">Clear all your activity history?</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Your saved activity will be permanently deleted from your account. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearModal(false)}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl bg-[#0F1117] hover:bg-[#1A1D27] text-gray-300 hover:text-white text-xs font-semibold border border-[#2D3148] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                disabled={isClearing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-rose-600/20 disabled:opacity-50"
              >
                {isClearing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Clearing...</span>
                  </>
                ) : (
                  <span>Clear History</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
