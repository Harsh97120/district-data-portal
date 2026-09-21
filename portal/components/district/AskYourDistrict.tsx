"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import type { DistrictMetrics } from "@/lib/types/district";
import {
  processDistrictQuery,
  type StructuredAIResponse,
  type ConversationContext,
} from "@/lib/district-ai-engine";
import MarkdownRenderer from "@/components/ui/MarkdownRenderer";
import { logActivity } from "@/lib/activity-logger";

export interface AskYourDistrictProps {
  district: DistrictMetrics;
  allDistricts: DistrictMetrics[];
  stateName?: string;
  stateCode?: string;
  surveyYear?: "NFHS-5" | "NFHS-6";
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text?: string;
  structured?: StructuredAIResponse;
  timestamp: string;
}

export type WindowState = "closed" | "normal" | "minimized" | "maximized";

export default function AskYourDistrict({
  district,
  allDistricts,
  stateName: propStateName,
  stateCode: propStateCode,
  surveyYear = "NFHS-6",
  isOpen: propIsOpen,
  onOpenChange,
}: AskYourDistrictProps) {
  // Client mount state for SSR-safe portal rendering
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Window state: "closed" | "normal" (default active) | "minimized" | "maximized"
  const [windowState, setWindowState] = useState<WindowState>(() => {
    if (typeof propIsOpen === "boolean") {
      return propIsOpen ? "normal" : "closed";
    }
    return "closed";
  });

  // Track the previous active size so restoring returns to exact previous state
  const previousActiveSizeRef = useRef<"normal" | "maximized">("normal");

  // Keep windowState synchronized when controlled propIsOpen changes
  useEffect(() => {
    if (typeof propIsOpen === "boolean") {
      if (propIsOpen) {
        setWindowState((prev) => {
          if (prev === "closed" || prev === "minimized") {
            return previousActiveSizeRef.current || "normal";
          }
          return prev;
        });
      } else {
        setWindowState((prev) => {
          if (prev === "normal" || prev === "maximized") {
            return "closed";
          }
          return prev;
        });
      }
    }
  }, [propIsOpen]);

  // Window control handlers
  const handleOpenFromClosed = useCallback(() => {
    previousActiveSizeRef.current = "normal";
    setWindowState("normal");
    onOpenChange?.(true);
  }, [onOpenChange]);

  const handleRestoreFromMinimized = useCallback(() => {
    const targetSize = previousActiveSizeRef.current || "normal";
    setWindowState(targetSize);
    onOpenChange?.(true);
  }, [onOpenChange]);

  const handleMinimize = useCallback(() => {
    if (windowState === "normal" || windowState === "maximized") {
      previousActiveSizeRef.current = windowState;
    }
    setWindowState("minimized");
    onOpenChange?.(false);
  }, [windowState, onOpenChange]);

  const handleClose = useCallback(() => {
    previousActiveSizeRef.current = "normal";
    setWindowState("closed");
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handleMaximizeToggle = useCallback(() => {
    if (windowState === "maximized") {
      setWindowState("normal");
    } else {
      previousActiveSizeRef.current = "normal";
      setWindowState("maximized");
    }
  }, [windowState]);

  const stateName = propStateName || district.state_name || "State";
  const stateCode = propStateCode || district.state_code || "IN";
  const dName = district.district_name;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [thinkingStage, setThinkingStage] = useState<string>("Analyzing district data...");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Persistent context for follow-up questions
  const contextRef = useRef<ConversationContext>({
    activeDistrict: district,
    allDistricts,
    stateName,
    stateCode,
    surveyYear,
  });

  // Keep contextRef synchronized
  useEffect(() => {
    contextRef.current = {
      ...contextRef.current,
      activeDistrict: district,
      allDistricts,
      stateName,
      stateCode,
      surveyYear,
    };
  }, [district, allDistricts, stateName, stateCode, surveyYear]);

  // Initial welcome message tailored to the current district
  const resetConversation = useCallback(() => {
    const defaultWelcome: Message = {
      id: "welcome-" + district.district_id,
      sender: "bot",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      structured: {
        title: "District Intelligence Assistant",
        subtitle: `${dName}, ${stateName} · Connected to Grounded Microdata`,
        summary: `Welcome to the district intelligence assistant for **${dName}** (${stateName}). I answer questions strictly using verified data from the **${district.metadata?.source || "NFHS-5"}** survey (${district.metadata?.year || "2019-21"}) and machine learning models.`,
        bullets: [
          `**Gaps & Priorities**: "What are ${dName}'s biggest development gaps?"`,
          `**Cross-District Comparison**: "Compare ${dName} with Surat" or "Compare ${dName} with Pune"`,
          `**State Benchmark**: "Compare ${dName} with ${stateName} average"`,
          `**ML Peer Districts**: "Find districts similar to ${dName}"`,
          `**Indicator Explanations**: "Explain stunting" or "Why is nutrition important?"`,
        ],
        citation: `National Family Health Survey (${district.metadata?.source || "NFHS-5"}) Verified Factsheets. No statistics are fabricated.`,
      },
    };
    setMessages([defaultWelcome]);
  }, [dName, stateName, district.district_id, district.metadata?.source, district.metadata?.year]);

  // Reset or initialize on district change
  useEffect(() => {
    resetConversation();
  }, [resetConversation]);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages, isThinking]);

  // Focus input when opened or restored
  const isPanelOpen = windowState === "normal" || windowState === "maximized";
  useEffect(() => {
    if (isPanelOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [isPanelOpen]);

  // Keyboard shortcut: Escape to restore from maximized or close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (windowState === "maximized") {
          setWindowState("normal");
        } else if (windowState === "normal") {
          handleClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [windowState, handleClose]);

  // Handle user query submission
  const handleQuery = async (queryText: string) => {
    const trimmed = queryText.trim();
    if (!trimmed || isThinking) return;

    const userMsg: Message = {
      id: "user-" + Date.now(),
      sender: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    // Log AI_QUERY activity asynchronously for authenticated users
    logActivity({
      actionType: "AI_QUERY",
      districtId: district.district_id,
      districtName: district.district_name,
      stateName: propStateName,
      stateCode: propStateCode,
      query: trimmed,
    });

    // Progressive thinking stages
    setThinkingStage("Retrieving district records...");
    const t1 = setTimeout(() => setThinkingStage("Comparing indicators across datasets..."), 280);
    const t2 = setTimeout(() => setThinkingStage("Synthesizing data-grounded insights..."), 520);

    try {
      const response = await processDistrictQuery(trimmed, contextRef.current);
      clearTimeout(t1);
      clearTimeout(t2);

      // Brief delay so the user perceives genuine analytical computation
      setTimeout(() => {
        const botMsg: Message = {
          id: "bot-" + Date.now(),
          sender: "bot",
          structured: response,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, botMsg]);
        setIsThinking(false);
      }, 300);
    } catch {
      clearTimeout(t1);
      clearTimeout(t2);
      setIsThinking(false);
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-err-" + Date.now(),
          sender: "bot",
          structured: {
            title: "Data Engine Notice",
            summary: `I encountered an unexpected issue while retrieving indicators for "${trimmed}". Please try asking about a specific indicator like stunting or compare with a known district.`,
            citation: "Portal Grounded Engine",
          },
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    }
  };

  // Peer suggestion for quick chips
  const peerSample = allDistricts.find((d) => d.district_id !== district.district_id)?.district_name || "Surat";

  const isMaximized = windowState === "maximized";

  const getSizeClasses = () => {
    if (isMaximized) {
      return "w-[calc(100vw-2rem)] sm:w-[calc(100vw-4rem)] max-w-6xl h-[calc(100vh-2rem)] sm:h-[calc(100vh-4rem)] max-h-[92vh] inset-3 sm:inset-6 top-3 sm:top-6 left-3 sm:left-6 right-3 sm:right-6 bottom-3 sm:bottom-6 m-auto";
    }
    return "w-[calc(100vw-2rem)] sm:w-[440px] max-w-[460px] h-[610px] max-h-[72vh] sm:max-h-[75vh] right-4 sm:right-6 bottom-[88px] sm:bottom-[90px] top-auto left-auto";
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* ── 1. Subtle Ambient Backdrop (Maximized Mode) ──────────────── */}
      {isMaximized && (
        <div
          onClick={() => setWindowState("normal")}
          className="fixed inset-0 bg-black/65 backdrop-blur-[2px] z-[9998] transition-opacity duration-300 cursor-pointer animate-fade-in"
          title="Click to restore standard view"
        />
      )}

      {/* ── 2. STATE A: Standard AI Launcher Button (When CLOSED) ───── */}
      {windowState === "closed" && (
        <div className="fixed bottom-6 right-6 sm:bottom-7 sm:right-7 md:bottom-8 md:right-8 z-[9999] flex items-center group animate-fade-in">
          {/* Tooltip on left */}
          <div className="hidden sm:flex absolute right-full mr-3.5 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 translate-x-1.5 group-hover:translate-x-0 transition-all duration-200 pointer-events-none z-10">
            <div className="relative px-3.5 py-2 rounded-xl bg-[#1A1D27] border border-[#2D3148] shadow-2xl text-gray-200 text-xs font-semibold whitespace-nowrap flex items-center gap-2">
              <span className="text-orange-400 font-bold">✦</span>
              <span>Get insights about {dName}&apos;s data</span>
              <div className="absolute left-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-l-[#2D3148]" />
              <div className="absolute left-full top-1/2 -translate-y-1/2 -ml-[1px] border-[4px] border-transparent border-l-[#1A1D27]" />
            </div>
          </div>

          {/* Circular Launcher Button */}
          <button
            type="button"
            onClick={handleOpenFromClosed}
            aria-label={`Open AI Assistant for ${dName}`}
            className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#161924]/95 hover:bg-[#1C2030] border-2 border-orange-500/70 hover:border-orange-400 text-white shadow-2xl shadow-black/90 backdrop-blur-md flex flex-col items-center justify-center cursor-pointer animate-ai-button-glow transition-all duration-200 hover:scale-105 active:scale-95"
          >
            <span className="text-orange-400 text-lg font-black leading-none group-hover:rotate-12 transition-transform duration-300">
              ✦
            </span>
            <span className="text-[9px] font-extrabold text-white tracking-tight uppercase leading-none mt-1">
              Ask AI
            </span>
            <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#161924] animate-pulse" />
          </button>
        </div>
      )}

      {/* ── 3. STATE B: Active Minimized Pill Button (When MINIMIZED) ─ */}
      {windowState === "minimized" && (
        <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[9999] flex items-center group animate-fade-in">
          {/* Tooltip on left */}
          <div className="hidden sm:flex absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 translate-x-1.5 group-hover:translate-x-0 transition-all duration-200 pointer-events-none z-10">
            <div className="relative px-3 py-1.5 rounded-xl bg-[#12141D] border border-orange-500/40 shadow-2xl text-gray-200 text-xs font-semibold whitespace-nowrap flex items-center gap-2">
              <span className="text-orange-400 font-bold">✦</span>
              <span>Resume active conversation with {dName} AI</span>
              <div className="absolute left-full top-1/2 -translate-y-1/2 border-[5px] border-transparent border-l-orange-500/40" />
              <div className="absolute left-full top-1/2 -translate-y-1/2 -ml-[1px] border-[4px] border-transparent border-l-[#12141D]" />
            </div>
          </div>

          {/* Streamlined Minimized Pill Widget */}
          <button
            type="button"
            onClick={handleRestoreFromMinimized}
            aria-label={`Resume active conversation with ${dName} AI`}
            className="relative h-9.5 sm:h-10 px-2.5 sm:px-3 rounded-full bg-[#12141D] hover:bg-[#1A1D2B] border border-orange-500/80 hover:border-orange-400 text-white shadow-[0_8px_24px_rgba(0,0,0,0.85),0_0_8px_rgba(255,107,53,0.22)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.95),0_0_12px_rgba(255,107,53,0.38)] flex items-center gap-2 cursor-pointer transition-all duration-200 ease-out hover:scale-[1.015] active:scale-[0.985] animate-pulse-glow select-none"
          >
            {/* Unified Active AI Icon: Sparkle with live emerald beacon */}
            <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/15 border border-orange-500/30 flex-shrink-0">
              <span className="text-orange-400 text-[10px] font-black leading-none">✦</span>
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 border border-[#12141D]" />
              </span>
            </div>

            {/* Compact Text Stack */}
            <div className="flex flex-col text-left justify-center min-w-0">
              <div className="flex items-center gap-1 leading-none">
                <span className="text-[11px] font-bold text-white tracking-tight">
                  AI Active
                </span>
                <span className="text-[9.5px] text-orange-400 font-semibold truncate max-w-[65px] sm:max-w-[85px]">
                  · {dName}
                </span>
              </div>
              <span className="text-[8px] text-gray-400 font-medium leading-none mt-0.5">
                Click to resume
              </span>
            </div>

            {/* Restore Arrow Icon */}
            <svg
              className="w-3 h-3 text-orange-400/90 flex-shrink-0 ml-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
              />
            </svg>
          </button>
        </div>
      )}

      {/* ── 4. CHATBOT PANEL (NORMAL or MAXIMIZED State) ─────────────── */}
      <div
        className={`fixed z-[9999] bg-[#1A1D27] border border-[#2D3148] rounded-2xl shadow-2xl shadow-black/95 flex flex-col overflow-hidden transition-all duration-300 ease-in-out origin-bottom-right ${getSizeClasses()} ${
          isPanelOpen
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={`District Intelligence AI Assistant for ${dName}`}
      >
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div
          onDoubleClick={handleMaximizeToggle}
          title="Double-click header to maximize or restore"
          className="px-4 py-3 border-b border-[#2D3148] bg-[#141722]/95 flex items-center justify-between gap-2.5 flex-shrink-0 select-none cursor-default"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Sparkle Icon Badge */}
            <div className="w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
              <span className="text-orange-400 text-sm font-black">✦</span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white tracking-wide truncate">
                  District Intelligence AI
                </h3>
                {/* Data-Grounded Status Badge */}
                <span className="hidden xs:inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-semibold text-emerald-400 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Data-grounded
                </span>
              </div>
              <p className="text-[11px] text-orange-400 font-medium truncate mt-0.5">
                {dName}, {stateName}
              </p>
            </div>
          </div>

          {/* Action Controls: [− Minimize] [⛶ Maximize / ↙ Restore] [↻ Refresh] [× Close] */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Minimize button (−) */}
            <button
              type="button"
              onClick={handleMinimize}
              title="Minimize"
              aria-label="Minimize"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#242838] border border-transparent hover:border-[#2D3148] transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14" />
              </svg>
            </button>

            {/* Maximize / Restore button (⛶ / ↙) */}
            <button
              type="button"
              onClick={handleMaximizeToggle}
              title={isMaximized ? "Restore" : "Maximize"}
              aria-label={isMaximized ? "Restore" : "Maximize"}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                isMaximized
                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/40 shadow-xs hover:bg-orange-500/30"
                  : "text-gray-400 hover:text-orange-300 hover:bg-orange-500/15 border border-transparent hover:border-orange-500/30"
              }`}
            >
              {isMaximized ? (
                /* Restore icon (↙) */
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 3H5a2 2 0 00-2 2v4m18 0V5a2 2 0 00-2-2h-4m-6 18h4a2 2 0 002-2v-4m-12 0v4a2 2 0 002 2h4"
                  />
                </svg>
              ) : (
                /* Maximize icon (⛶) */
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              )}
            </button>

            {/* Refresh / Reset conversation (↻) */}
            <button
              type="button"
              onClick={resetConversation}
              title="Refresh"
              aria-label="Refresh"
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#242838] border border-transparent hover:border-[#2D3148] transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>

            {/* Close button (×) with distinct rose hover state */}
            <button
              type="button"
              onClick={handleClose}
              title="Close"
              aria-label="Close"
              className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/20 border border-transparent hover:border-rose-500/30 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Quick Question Suggestions ──────────────────────────────── */}
        <div className="px-3 py-2 bg-[#0F1117]/80 border-b border-[#2D3148]/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
          {[
            { label: "Gaps & Priorities", query: `What are ${dName}'s biggest development gaps?` },
            { label: `Compare with ${peerSample}`, query: `Compare ${dName} with ${peerSample}` },
            { label: `Compare with ${stateName} Avg`, query: `Compare ${dName} with ${stateName} average` },
            { label: "Find Similar Districts", query: `Find districts similar to ${dName}` },
            { label: "Explain Nutrition", query: "Explain the child nutrition indicators in simple words." },
            { label: "Why is there a difference?", query: `Why does ${dName} differ from ${peerSample} in nutrition?` },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleQuery(chip.query)}
              disabled={isThinking}
              className="px-2.5 py-1 rounded-lg bg-[#1A1D27] hover:bg-[#242838] border border-[#2D3148] hover:border-orange-500/50 text-[10px] text-gray-300 hover:text-white font-medium whitespace-nowrap transition-colors cursor-pointer disabled:opacity-50"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* ── Messages Scroll Area (Independent scrolling, min-h-0) ──── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-[#0F1117]">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
            >
              {m.sender === "user" ? (
                /* User Message Bubble */
                <div className="max-w-[85%] rounded-2xl rounded-tr-none px-3.5 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white font-medium text-xs leading-relaxed shadow-md">
                  <p>{m.text}</p>
                  <span className="block text-[8.5px] text-white/70 text-right mt-1">
                    {m.timestamp}
                  </span>
                </div>
              ) : m.structured ? (
                /* Structured AI Message Card */
                <div className="w-full max-w-[96%] rounded-2xl rounded-tl-none border border-[#2D3148] bg-[#1A1D27] p-4 text-xs space-y-3.5 shadow-md">
                  {/* Title & Subtitle */}
                  {m.structured.title && (
                    <div className="border-b border-[#2D3148] pb-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-orange-400 text-xs">✦</span>
                          <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                            {m.structured.title}
                          </span>
                        </div>
                        <span className="text-[9px] text-gray-500">{m.timestamp}</span>
                      </div>
                      {m.structured.subtitle && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{m.structured.subtitle}</p>
                      )}
                    </div>
                  )}

                  {/* Summary with full Markdown parsing (bold, tables, lists, links) */}
                  {m.structured.summary && (
                    <MarkdownRenderer
                      content={m.structured.summary}
                      className="text-gray-200 text-[11.5px]"
                    />
                  )}

                  {/* ── Mini Visual Comparison Bars ───────────────────────── */}
                  {m.structured.visualBars && m.structured.visualBars.length > 0 && (
                    <div className="space-y-2.5 my-3 p-3 rounded-xl bg-[#0F1117]/80 border border-[#2D3148]">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">
                        Visual Comparison Benchmark
                      </span>
                      {m.structured.visualBars.map((bar, i) => (
                        <div key={i} className="space-y-1 text-[10px]">
                          <div className="flex justify-between items-center text-gray-300 font-medium">
                            <span>{bar.label}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                                bar.isEntity1Better
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              }`}
                            >
                              {bar.diffFormatted}
                            </span>
                          </div>

                          {/* Bar 1 */}
                          <div className="flex items-center gap-2">
                            <span className="w-20 truncate text-gray-400 text-[9px]">{bar.entity1Name}</span>
                            <div className="flex-1 h-2 rounded-full bg-[#1A1D27] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  bar.isEntity1Better ? "bg-orange-500" : "bg-gray-400"
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(8, bar.entity1Value))}%`,
                                }}
                              />
                            </div>
                            <span className="w-12 text-right font-bold text-white tabular-nums text-[9.5px]">
                              {bar.entity1Value.toFixed(1)}
                              {bar.unit}
                            </span>
                          </div>

                          {/* Bar 2 */}
                          <div className="flex items-center gap-2">
                            <span className="w-20 truncate text-gray-500 text-[9px]">{bar.entity2Name}</span>
                            <div className="flex-1 h-2 rounded-full bg-[#1A1D27] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  !bar.isEntity1Better ? "bg-orange-500" : "bg-gray-500"
                                }`}
                                style={{
                                  width: `${Math.min(100, Math.max(8, bar.entity2Value))}%`,
                                }}
                              />
                            </div>
                            <span className="w-12 text-right font-bold text-gray-300 tabular-nums text-[9.5px]">
                              {bar.entity2Value.toFixed(1)}
                              {bar.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Tabular Comparison Grid ───────────────────────────── */}
                  {m.structured.comparisons && m.structured.comparisons.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-[#2D3148] my-2">
                      <table className="w-full text-left text-[10px] divide-y divide-[#2D3148]">
                        <thead className="bg-[#0F1117] text-gray-400 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="p-2">Indicator</th>
                            <th className="p-2 text-right">{dName}</th>
                            <th className="p-2 text-right">Target</th>
                            <th className="p-2 text-right">Difference</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2D3148]/60 bg-[#141722]/50">
                          {m.structured.comparisons.map((c, i) => (
                            <tr key={i} className="hover:bg-[#242838]/40 transition-colors">
                              <td className="p-2 text-gray-300 font-medium">{c.label}</td>
                              <td className="p-2 text-right font-bold text-white tabular-nums">
                                {c.entity1Value.toFixed(1)}
                                <span className="text-gray-500 text-[8.5px] ml-0.5">{c.unit}</span>
                              </td>
                              <td className="p-2 text-right font-bold text-gray-300 tabular-nums">
                                {c.entity2Value.toFixed(1)}
                                <span className="text-gray-500 text-[8.5px] ml-0.5">{c.unit}</span>
                              </td>
                              <td
                                className={`p-2 text-right font-extrabold tabular-nums ${
                                  c.isEntity1Better ? "text-emerald-400" : "text-amber-400"
                                }`}
                              >
                                {c.diffFormatted}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* ── Multi-District Comparison Table ──────────────────── */}
                  {m.structured.multiComparisons && m.structured.multiComparisons.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-[#2D3148] my-2">
                      <table className="w-full text-left text-[10px] divide-y divide-[#2D3148]">
                        <thead className="bg-[#0F1117] text-gray-400 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="p-2">Indicator</th>
                            {m.structured.multiComparisons[0]?.values.map((v, i) => (
                              <th key={i} className="p-2 text-right">
                                {v.districtName}
                              </th>
                            ))}
                            <th className="p-2 text-center">Top Performing</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2D3148]/60 bg-[#141722]/50">
                          {m.structured.multiComparisons.map((mc, i) => (
                            <tr key={i} className="hover:bg-[#242838]/40 transition-colors">
                              <td className="p-2 text-gray-300 font-medium">{mc.label}</td>
                              {mc.values.map((v, j) => (
                                <td key={j} className="p-2 text-right font-bold text-white tabular-nums">
                                  {v.value.toFixed(1)}
                                  <span className="text-gray-500 text-[8.5px] ml-0.5">{mc.unit}</span>
                                </td>
                              ))}
                              <td className="p-2 text-center">
                                <span className="px-1.5 py-0.5 rounded text-[8.5px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                  {mc.bestDistrict}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* ── ML Peer / Similar Districts Cards ────────────────── */}
                  {m.structured.similarDistricts && m.structured.similarDistricts.length > 0 && (
                    <div className="space-y-2 my-2.5">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Verified Nearest Peer Districts (KNN)
                      </span>
                      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isMaximized ? "lg:grid-cols-3" : ""} gap-2.5`}>
                        {m.structured.similarDistricts.map((peer, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-xl bg-[#0F1117] border border-[#2D3148] flex flex-col justify-between"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-xs font-bold text-white">{peer.districtName}</h4>
                                <span className="text-[9px] text-orange-400 block mt-0.5">
                                  {peer.stateName}
                                </span>
                              </div>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {peer.similarityScore}% Match
                              </span>
                            </div>
                            <p className="text-[9px] text-gray-400 mt-2">
                              Shared profile: {peer.keyStrengths}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Diagnostic Reasoning: "Why is there a difference?" ─ */}
                  {m.structured.diagnosticReasoning && (
                    <div className="space-y-2.5 p-3 rounded-xl bg-[#0F1117] border border-[#2D3148] my-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-400" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                          Actual Data vs AI Interpretation
                        </span>
                      </div>

                      {/* Measured numbers with markdown support */}
                      {m.structured.diagnosticReasoning.actualData.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-[9px] font-semibold text-gray-400 block uppercase">
                            Measured Indicators
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-[10.5px] text-gray-300">
                            {m.structured.diagnosticReasoning.actualData.map((d, i) => (
                              <li key={i}>
                                <MarkdownRenderer
                                  content={d}
                                  className="inline text-gray-300 font-mono text-[10.5px]"
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Analytical interpretation with markdown support */}
                      <div className="pt-2 border-t border-[#2D3148]/60 space-y-1">
                        <span className="text-[9px] font-semibold text-orange-400 block uppercase">
                          AI Developmental Interpretation
                        </span>
                        <MarkdownRenderer
                          content={m.structured.diagnosticReasoning.aiInterpretation}
                          className="text-gray-300 text-[11px]"
                        />
                      </div>

                      {/* Disclaimer Caveat */}
                      <p className="text-[8.5px] text-gray-500 italic pt-1">
                        {m.structured.diagnosticReasoning.caveat}
                      </p>
                    </div>
                  )}

                  {/* ── Bullet Points with Markdown Parsing ──────────────── */}
                  {m.structured.bullets && m.structured.bullets.length > 0 && (
                    <ul className="space-y-1.5 text-gray-300 text-[11px] pl-1 font-normal">
                      {m.structured.bullets.map((b, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-orange-400 text-xs mt-0.5">•</span>
                          <div className="flex-1 min-w-0">
                            <MarkdownRenderer content={b} className="text-gray-300 text-[11px]" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* ── Insights Callout with Markdown Parsing ───────────── */}
                  {m.structured.insights && m.structured.insights.length > 0 && (
                    <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/25 text-[10.5px] text-orange-200 leading-relaxed space-y-1">
                      <span className="font-bold uppercase tracking-wider text-[9px] text-orange-400 block">
                        Key Insights
                      </span>
                      {m.structured.insights.map((ins, i) => (
                        <div key={i} className="flex items-start gap-1.5">
                          <span className="text-orange-400 text-xs mt-0.5">•</span>
                          <div className="flex-1 min-w-0">
                            <MarkdownRenderer content={ins} className="text-orange-200 text-[10.5px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Footnote Citation ───────────────────────────────── */}
                  <div className="text-[9px] text-gray-500 pt-2 border-t border-[#2D3148]/60 flex items-center justify-between gap-2">
                    <span className="truncate">Data source: {m.structured.citation}</span>
                    <span className="text-emerald-400/90 font-bold uppercase tracking-widest text-[8px] flex-shrink-0">
                      Grounded
                    </span>
                  </div>
                </div>
              ) : (
                /* Fallback Plain Bot Message with Markdown parsing */
                m.text && (
                  <div className="w-full max-w-[96%] rounded-2xl rounded-tl-none border border-[#2D3148] bg-[#1A1D27] p-4 text-xs space-y-2 shadow-md">
                    <MarkdownRenderer content={m.text} className="text-gray-200 text-xs" />
                    <span className="block text-[8.5px] text-gray-500 text-right mt-1">
                      {m.timestamp}
                    </span>
                  </div>
                )
              )}
            </div>
          ))}

          {/* Thinking / Loading Indicator */}
          {isThinking && (
            <div className="flex justify-start animate-fade-in">
              <div className="rounded-2xl rounded-tl-none border border-orange-500/30 bg-[#1A1D27] p-3.5 flex items-center gap-3 shadow-lg">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce delay-0" />
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-bounce delay-200" />
                </div>
                <span className="text-xs text-orange-300 font-medium">
                  {thinkingStage}
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Input Bar ───────────────────────────────────────────────── */}
        <div className="p-3 border-t border-[#2D3148] bg-[#141722]/90 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleQuery(input);
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about ${dName}, compare with Surat, Pune...`}
              disabled={isThinking}
              className="flex-1 rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-orange-500 focus:outline-none text-xs text-white placeholder-gray-500 px-3.5 py-2.5 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              aria-label="Send query"
              className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 active:scale-95 text-white font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-orange-500/20"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
          <div className="flex items-center justify-between text-[9px] text-gray-500 mt-1.5 px-1">
            <span>Answers grounded in NFHS factsheets</span>
            <kbd className="hidden sm:inline-block px-1 py-0.5 rounded bg-[#0F1117] border border-[#2D3148] text-gray-400 font-mono text-[8px]">
              Esc to close
            </kbd>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
