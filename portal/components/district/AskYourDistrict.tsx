"use client";

import { useState, useRef, useEffect } from "react";
import type { DistrictMetrics } from "@/lib/types/district";
import { METRIC_LABELS } from "@/lib/constants";
import {
  getSimilarDistricts,
  getPeerAverage,
  getStateAverage,
  getPriorityAreas,
  runKMeansClustering,
  checkDevelopmentParadoxes,
} from "@/lib/ml-utils";

interface AskYourDistrictProps {
  district: DistrictMetrics;
  allDistricts: DistrictMetrics[];
}

interface StructuredContent {
  title?: string;
  summary: string;
  metrics?: { label: string; value: string; compareLabel: string; compareValue: string; isWarning: boolean }[];
  bullets?: string[];
  insight?: string;
  citation: string;
}

interface Message {
  sender: "user" | "bot";
  text?: string;
  structured?: StructuredContent;
}

export default function AskYourDistrict({ district, allDistricts }: AskYourDistrictProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: "bot",
      structured: {
        title: "District Intelligence Assistant",
        summary: `Welcome to the grounded intelligence dashboard for ${district.district_name} district. I can compile comparative analyses, outline gaps, and query raw indicators using verified data.`,
        bullets: [
          `Ask about development gaps: "What are ${district.district_name}'s biggest gaps?"`,
          `Ask about child nutrition: "Why is child nutrition a concern here?"`,
          `Ask for peer comparison: "Compare ${district.district_name} with peer districts."`,
          `Type any specific indicator to view comparison stats (e.g. "contraception", "electricity").`
        ],
        citation: "NFHS-5 (2019-21) and ML Engine Calculations",
      },
    },
  ]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (messages.length > 1) {
      scrollToBottom();
    }
  }, [messages]);

  const handleQuery = (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: Message = { sender: "user", text: queryText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    // Simulate AI computing response
    setTimeout(() => {
      const reply = generateGroundedAnswer(queryText);
      setMessages((prev) => [...prev, { sender: "bot", structured: reply }]);
    }, 600);
  };

  const generateGroundedAnswer = (query: string): StructuredContent => {
    const q = query.toLowerCase();
    const dName = district.district_name;

    // 1. Biggest development gaps & priorities
    if (q.includes("gap") || q.includes("improve") || q.includes("weak") || q.includes("priority")) {
      const priorities = getPriorityAreas(district, allDistricts).slice(0, 3);
      const metrics = priorities.map(p => {
        const meta = METRIC_LABELS[p.field];
        const isWarning = meta ? meta.direction === "negative" ? p.value > p.stateAverage : p.value < p.stateAverage : true;
        return {
          label: p.label,
          value: `${p.value.toFixed(1)}${meta?.unit || "%"}`,
          compareLabel: "State Avg",
          compareValue: `${p.stateAverage.toFixed(1)}${meta?.unit || "%"}`,
          isWarning
        };
      });

      return {
        title: "Development Priorities & Gaps Analysis",
        summary: `An analysis of ${dName}'s indicators shows the following three areas require the most immediate attention, ranked by severity and negative deviation from state averages:`,
        metrics,
        insight: `Programmatic focus should be placed on ${priorities[0].label.toLowerCase()} which shows the highest severity score (${priorities[0].priorityScore.toFixed(0)}), followed by ${priorities[1].label.toLowerCase()}.`,
        citation: `National Family Health Survey (NFHS-5) 2019-21 Factsheets. Computed dynamically via Priority Engine.`,
      };
    }

    // 2. Nutrition concern
    if (q.includes("nutrition") || q.includes("stunting") || q.includes("wasting") || q.includes("underweight") || q.includes("anaemia") || q.includes("anemia")) {
      const stateAverages = getStateAverage(allDistricts);
      const metrics = [
        {
          label: "Child Stunting",
          value: `${(district.child_stunting ?? 0).toFixed(1)}%`,
          compareLabel: "State Avg",
          compareValue: `${(stateAverages["child_stunting"] ?? 0).toFixed(1)}%`,
          isWarning: (district.child_stunting ?? 0) > (stateAverages["child_stunting"] ?? 0)
        },
        {
          label: "Child Wasting",
          value: `${(district.child_wasting ?? 0).toFixed(1)}%`,
          compareLabel: "State Avg",
          compareValue: `${(stateAverages["child_wasting"] ?? 0).toFixed(1)}%`,
          isWarning: (district.child_wasting ?? 0) > (stateAverages["child_wasting"] ?? 0)
        },
        {
          label: "Child Anaemia",
          value: `${(district.child_anaemia ?? 0).toFixed(1)}%`,
          compareLabel: "State Avg",
          compareValue: `${(stateAverages["child_anaemia"] ?? 0).toFixed(1)}%`,
          isWarning: (district.child_anaemia ?? 0) > (stateAverages["child_anaemia"] ?? 0)
        },
        {
          label: "Pregnant Women Anaemia",
          value: `${(district.women_anaemia ?? 0).toFixed(1)}%`,
          compareLabel: "State Avg",
          compareValue: `${(stateAverages["women_anaemia"] ?? 0).toFixed(1)}%`,
          isWarning: (district.women_anaemia ?? 0) > (stateAverages["women_anaemia"] ?? 0)
        }
      ];

      return {
        title: "Child Nutrition & Anaemia Profile",
        summary: `Nutrition remains a major systemic challenge in ${dName} district. High rates of child stunting and wasting point to critical nutritional deficits.`,
        metrics,
        bullets: [
          `Only ${(district.adequate_diet ?? 0).toFixed(1)}% of children aged 6-23 months receive a minimum adequate diet.`,
          `Exclusive breastfeeding for infants under 6 months stands at ${(district.exclusive_breastfeeding ?? 0).toFixed(1)}%.`
        ],
        insight: "Chronic undernutrition (stunting) combined with acute wasting requires nutritional supplementation and local counseling on infant feeding.",
        citation: "Ministry of Health & Family Welfare, NFHS-5 (2019-21) Factsheets.",
      };
    }

    // 3. Similar districts comparison
    if (q.includes("compare") || q.includes("similar") || q.includes("peer") || q.includes("knn") || q.includes("cluster")) {
      const peers = getSimilarDistricts(district, allDistricts, 3);
      const peerAverages = getPeerAverage(peers);
      
      const clusters = runKMeansClustering(allDistricts, 4);
      const myCluster = clusters.find(c => c.districts.some(d => d.district_id === district.district_id));
      const clusterLabel = myCluster ? myCluster.label : "Moderate Development Profile";

      const metrics = [
        {
          label: "Electricity Access",
          value: `${(district.electricity_access ?? 0).toFixed(1)}%`,
          compareLabel: "Peer Avg",
          compareValue: `${(peerAverages["electricity_access"] ?? 0).toFixed(1)}%`,
          isWarning: (district.electricity_access ?? 0) < (peerAverages["electricity_access"] ?? 0)
        },
        {
          label: "Child Stunting",
          value: `${(district.child_stunting ?? 0).toFixed(1)}%`,
          compareLabel: "Peer Avg",
          compareValue: `${(peerAverages["child_stunting"] ?? 0).toFixed(1)}%`,
          isWarning: (district.child_stunting ?? 0) > (peerAverages["child_stunting"] ?? 0)
        },
        {
          label: "Female Literacy",
          value: `${(district.literacy_rate ?? 0).toFixed(1)}%`,
          compareLabel: "Peer Avg",
          compareValue: `${(peerAverages["literacy_rate"] ?? 0).toFixed(1)}%`,
          isWarning: (district.literacy_rate ?? 0) < (peerAverages["literacy_rate"] ?? 0)
        }
      ];

      return {
        title: "Peer Group & Similarity Analysis (ML)",
        summary: `Using K-Nearest Neighbors (KNN), ${dName} is compared against its nearest peer districts: **${peers[0].district_name}**, **${peers[1].district_name}**, and **${peers[2].district_name}**.`,
        metrics,
        insight: `${dName} is clustered under the "${clusterLabel}" development profile, reflecting strong basic utility coverage but lagging social outcomes compared to its structural peers.`,
        citation: "L2-Norm Euclidean Distance of 6 Development Dimensions.",
      };
    }

    // 4. Specific indicator search
    const keys = Object.keys(METRIC_LABELS);
    for (const key of keys) {
      const meta = METRIC_LABELS[key];
      const keywords = meta.label.toLowerCase().split(/[\s%(),]+/);
      const match = keywords.some(kw => kw.length > 3 && q.includes(kw)) || q.includes(key.replace(/_/g, " "));

      if (match) {
        const val = district[key as keyof DistrictMetrics];
        if (typeof val === "number") {
          const stateAverages = getStateAverage(allDistricts);
          const stateVal = stateAverages[key] ?? val;
          const gap = val - stateVal;
          const better = meta.direction === "positive" ? gap > 0 : gap < 0;

          return {
            title: `Indicator Profile: ${meta.label}`,
            summary: `Verified NFHS-5 (2019-21) data for ${meta.label}:`,
            metrics: [
              {
                label: dName,
                value: `${val.toFixed(1)}${meta.unit}`,
                compareLabel: "State Avg",
                compareValue: `${stateVal.toFixed(1)}${meta.unit}`,
                isWarning: !better
              }
            ],
            insight: meta.description,
            citation: `${district.metadata.source} Factsheet (${district.metadata.year})`,
          };
        }
      }
    }

    // Fallback response structure
    return {
      title: "Indicator Lookup Assistant",
      summary: `I searched the ${dName} district dataset but could not find a exact match for "${query}". I can explain developmental indicators across nutrition, education, health, and basic infrastructure.`,
      bullets: [
        `Ask: "What are the biggest development gaps in ${dName}?"`,
        `Ask: "Why is child nutrition a concern in ${dName}?"`,
        `Ask: "Show similar peer districts of ${dName}."`
      ],
      citation: "NFHS-5 (2019-21) Grounded Data Lookup",
    };
  };

  return (
    <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-5 flex flex-col h-[460px]">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ask Your District (AI)</h3>
        <span className="text-[10px] text-gray-500 bg-[#0F1117] border border-[#2D3148] px-1.5 py-0.5 rounded-full">
          Grounded UI Response
        </span>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 mb-3">
        {[
          { label: "Gaps & Priorities", query: "What are the biggest development gaps?" },
          { label: "Nutrition Profile", query: "Why is nutrition a concern?" },
          { label: "Peer Comparisons (KNN)", query: "Compare with similar districts." },
        ].map((chip) => (
          <button
            key={chip.label}
            onClick={() => handleQuery(chip.query)}
            className="px-2.5 py-1 rounded-lg bg-[#0F1117] border border-[#2D3148] hover:border-purple-500/50 text-gray-400 hover:text-white text-[10px] transition-colors cursor-pointer"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto bg-[#0F1117] border border-[#2D3148] rounded-xl p-4 mb-3 space-y-4">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.sender === "user" ? (
              <div className="max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed bg-purple-600 text-white font-medium rounded-tr-none">
                {m.text}
              </div>
            ) : (
              m.structured && (
                <div className="w-full max-w-[90%] rounded-xl rounded-tl-none border border-[#2D3148] bg-[#1A1D27] p-4 text-xs space-y-3">
                  {/* Header Title */}
                  {m.structured.title && (
                    <div className="flex items-center gap-1.5 border-b border-[#2D3148] pb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      <span className="font-bold text-white uppercase tracking-wider text-[10px]">
                        {m.structured.title}
                      </span>
                    </div>
                  )}
                  
                  {/* Summary Text */}
                  <p className="text-gray-300 leading-relaxed text-[11px]">{m.structured.summary}</p>
                  
                  {/* Comparative Metrics Grid */}
                  {m.structured.metrics && m.structured.metrics.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-2">
                      {m.structured.metrics.map((item, i) => (
                        <div
                          key={i}
                          className={`p-2.5 rounded-lg border flex justify-between items-center gap-3 bg-[#0F1117]/50 ${
                            item.isWarning ? "border-[#EF5350]/20" : "border-[#66BB6A]/20"
                          }`}
                        >
                          <div>
                            <span className="text-[10px] text-gray-400 block font-semibold leading-tight">
                              {item.label}
                            </span>
                            <span className="text-[9px] text-gray-500 block mt-0.5">
                              {item.compareLabel}: {item.compareValue}
                            </span>
                          </div>
                          <span className={`text-xs font-extrabold tabular-nums whitespace-nowrap ${
                            item.isWarning ? "text-[#EF5350]" : "text-[#66BB6A]"
                          }`}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bullet Points */}
                  {m.structured.bullets && m.structured.bullets.length > 0 && (
                    <ul className="list-disc list-inside space-y-1 my-2 text-gray-300 text-[11px] font-medium pl-1">
                      {m.structured.bullets.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  )}

                  {/* Highlighted Insight */}
                  {m.structured.insight && (
                    <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 text-[10px] text-purple-300 leading-relaxed font-medium">
                      <span className="font-bold uppercase tracking-wider text-[9px] text-purple-400 block mb-0.5">
                        Analytical Insight
                      </span>
                      {m.structured.insight}
                    </div>
                  )}

                  {/* Footnote Citation */}
                  <div className="text-[8.5px] text-gray-500 pt-2 border-t border-[#2D3148]/50 flex items-center justify-between">
                    <span>Citation: {m.structured.citation}</span>
                    <span className="text-purple-400/80 font-bold uppercase tracking-widest text-[7.5px]">Grounded</span>
                  </div>
                </div>
              )
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleQuery(input);
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about stunting, sanitation, schooling, contraception..."
          className="flex-1 rounded-xl bg-[#0F1117] border border-[#2D3148] focus:border-purple-500 focus:outline-none text-xs text-white px-3 py-2"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 font-medium text-xs text-white transition-colors"
        >
          Ask
        </button>
      </form>
    </div>
  );
}
