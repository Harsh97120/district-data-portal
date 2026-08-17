"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { DistrictMetrics } from "@/lib/types/district";
import {
  getDimensionScores,
  getSimilarDistricts,
  getStateAverage,
} from "@/lib/ml-utils";

interface SimilarDistrictsProps {
  district: DistrictMetrics;
  allDistricts: DistrictMetrics[];
}

const CATEGORY_NAMES: Record<string, string> = {
  health: "Health",
  nutrition: "Nutrition",
  women: "Women's Dev",
  child_wellbeing: "Child Wellbeing",
  education: "Education",
  basic_services: "Basic Services",
};

export default function SimilarDistricts({ district, allDistricts }: SimilarDistrictsProps) {
  // Compute KNN similar districts
  const peers = getSimilarDistricts(district, allDistricts, 3);
  const selectedScores = getDimensionScores(district);
  
  // Compute peer composite averages (we want dimension scores for peers)
  const peerScoresList = peers.map(p => getDimensionScores(p));
  const stateScoresList = allDistricts.map(d => getDimensionScores(d));

  const keys = Object.keys(CATEGORY_NAMES);
  
  const data = keys.map(key => {
    // Peer average score
    const peerSum = peerScoresList.reduce((sum, item) => sum + (item[key] || 0), 0);
    const peerAvg = parseFloat((peerSum / peers.length).toFixed(1));
    
    // State average score
    const stateSum = stateScoresList.reduce((sum, item) => sum + (item[key] || 0), 0);
    const stateAvg = parseFloat((stateSum / allDistricts.length).toFixed(1));

    return {
      name: CATEGORY_NAMES[key] || key,
      [district.district_name]: selectedScores[key] || 0,
      "Peer Average": peerAvg,
      "State Average": stateAvg,
    };
  });

  return (
    <div className="bg-[#1A1D27] border border-[#2D3148] rounded-2xl p-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Similar Districts & Peer Comparison</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Identified using K-Nearest Neighbors (KNN) based on developmental profiles
          </p>
        </div>
        
        {/* Peer list */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            Nearest Peers:
          </span>
          {peers.map((p) => (
            <span
              key={p.district_id}
              className="px-2.5 py-1 rounded-lg bg-[#0F1117] border border-[#2D3148] text-xs font-semibold text-white shadow-sm"
            >
              {p.district_name}
            </span>
          ))}
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="w-full h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            barGap={4}
          >
            {/* SVG Gradients definitions */}
            <defs>
              <linearGradient id="kutchGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#FF8F50" stopOpacity={0.75} />
              </linearGradient>
              <linearGradient id="peerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.75} />
              </linearGradient>
              <linearGradient id="stateGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4B5563" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#6B7280" stopOpacity={0.6} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#232635" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#9CA3AF", fontSize: 10, fontWeight: 500 }}
              tickLine={false}
              axisLine={{ stroke: "#2D3148" }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#9CA3AF", fontSize: 10, fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                background: "#1F2937",
                border: "1px solid #374151",
                borderRadius: "12px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.4)",
                color: "#F0F0F0",
                fontSize: "11px",
              }}
              cursor={{ fill: "rgba(255,255,255,0.02)" }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              wrapperStyle={{ fontSize: 11, paddingBottom: 15, fontWeight: 500 }}
            />
            <Bar
              dataKey={district.district_name}
              fill="url(#kutchGrad)"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Bar
              dataKey="Peer Average"
              fill="url(#peerGrad)"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Bar
              dataKey="State Average"
              fill="url(#stateGrad)"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 pt-4 border-t border-[#2D3148]/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10px] text-gray-500">
        <div className="flex items-center gap-1.5 bg-[#0F1117]/60 border border-[#2D3148] px-2.5 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="font-semibold text-gray-400">KNN Similarity Model:</span>
          <span>Euclidean Space Distance</span>
        </div>
        <div className="flex items-center gap-1.5 bg-[#0F1117]/60 border border-[#2D3148] px-2.5 py-1 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span className="font-semibold text-gray-400">Feature Vector:</span>
          <span>L2-norm of 6 composite dimensions</span>
        </div>
      </div>
    </div>
  );
}
