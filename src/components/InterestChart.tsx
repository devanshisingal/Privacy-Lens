import React, { useState } from "react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { Brain, Filter, BarChart3, Radio } from "lucide-react";

interface InterestChartProps {
  interests: Record<string, number>;
}

export default function InterestChart({ interests }: InterestChartProps) {
  const [chartType, setChartType] = useState<"radar" | "bar">("bar");

  // Transform interest key-value map into an ordered Recharts array
  const rawData = Object.entries(interests).map(([name, val]) => ({
    name,
    percentage: Math.round(val * 100),
  }));

  // Sort descending by value
  const sortedData = [...rawData].sort((a, b) => b.percentage - a.percentage);

  // Take top categories with non-trivial values, or show all for Radar
  const radarData = rawData.filter(d => d.percentage > 4 || rawData.length < 8);

  const getBarColor = (name: string) => {
    if (name === "Programming") return "#3b82f6"; // blue
    if (name === "AI / ML") return "#8b5cf6"; // purple
    if (name === "Gaming") return "#f43f5e"; // rose
    if (name === "Social Media") return "#ec4899"; // pink
    if (name === "Finance") return "#10b981"; // emerald
    if (name === "Entertainment") return "#e11d48"; // red
    if (name === "Sports") return "#f59e0b"; // amber
    if (name === "Shopping") return "#06b6d4"; // cyan
    return "#64748b"; // slate
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1e2230] border border-gray-700/80 p-3 rounded-lg shadow-xl font-sans">
          <p className="text-xs font-semibold text-white">{payload[0].payload.name}</p>
          <p className="text-xs mt-1 text-indigo-400 font-mono">
            Probability: <span className="text-white font-semibold">{payload[0].value}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="interest-predictor-card" className="bg-[#12141c] border border-gray-800/60 rounded-2xl p-6 shadow-xl flex flex-col h-full hover:border-gray-700/85 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-md font-bold text-white flex items-center gap-2 font-sans tracking-tight">
            <Brain size={18} className="text-indigo-400" />
            Interest Predictor Classification
          </h3>
          <p className="text-xs text-gray-400 font-sans mt-0.5">
            Real-time classification based on browsing history clusters
          </p>
        </div>

        <div className="flex bg-[#1e2230] rounded-lg p-1 shrink-0 border border-gray-800">
          <button
            onClick={() => setChartType("bar")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              chartType === "bar"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <BarChart3 size={13} />
            Bar Chart
          </button>
          <button
            onClick={() => setChartType("radar")}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              chartType === "radar"
                ? "bg-indigo-600 text-white shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Radio size={13} />
            Radar Plot
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-[250px] flex items-center justify-center">
        {chartType === "radar" ? (
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#2c3042" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "sans-serif" }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tick={{ fill: "#64748b", fontSize: 8 }}
                  axisLine={false}
                />
                <Radar
                  name="Interest Likelihood"
                  dataKey="percentage"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.35}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedData.slice(0, 6)}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} stroke="#2c3042" />
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "sans-serif" }}
                  width={85}
                  stroke="#2c3042"
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="percentage"
                  radius={[0, 4, 4, 0]}
                  barSize={12}
                  fill="#6366f1"
                >
                  {sortedData.slice(0, 6).map((entry, index) => (
                    <circle key={`cell-${index}`} fill={getBarColor(entry.name)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Numerical list summary */}
      <div className="mt-4 pt-4 border-t border-gray-800/40 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {sortedData.slice(0, 4).map((item, idx) => (
          <div key={`legend-${idx}`} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: getBarColor(item.name) }}
              />
              <span className="text-gray-400 truncate font-sans">{item.name}</span>
            </div>
            <span className="font-mono text-gray-200 ml-1 shrink-0">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
