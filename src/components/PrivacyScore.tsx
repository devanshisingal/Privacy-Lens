import React from "react";
import { ShieldCheck, ShieldAlert, Zap, Compass, Activity, Info } from "lucide-react";

interface PrivacyScoreProps {
  score: number;
  level: "Low" | "Medium" | "High";
  confidence: number;
  uniqueness: number;
  trackerExposure: number;
}

export default function PrivacyScore({
  score,
  level,
  confidence,
  uniqueness,
  trackerExposure,
}: PrivacyScoreProps) {
  // Get color schemes
  const getColors = (lvl: string) => {
    if (lvl === "High") return { text: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20", progress: "bg-red-500" };
    if (lvl === "Medium") return { text: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20", progress: "bg-amber-500" };
    return { text: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/20", progress: "bg-emerald-500" };
  };

  const colors = getColors(level);

  return (
    <div id="privacy-score-container" className="bg-[#12141c] border border-gray-800/60 rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-300 hover:border-gray-700/80">
      {/* Decorative gradient overlay */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/5 rounded-full blur-3xl rounded-none pointer-events-none" />

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400 font-sans">
          Algorithmic Privacy Risk
        </h3>
        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full flex items-center gap-1.5 ${colors.bg} ${colors.text} ${colors.border} border`}>
          {level === "High" ? <ShieldAlert size={12} /> : <ShieldCheck size={12} />}
          {level} Risk Profile
        </span>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Radial Risk Gauge */}
        <div className="relative flex items-center justify-center w-40 h-40 shrink-0">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background Track */}
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke="#1e2230"
              strokeWidth="10"
              fill="transparent"
            />
            {/* Active Arc */}
            <circle
              cx="50"
              cy="50"
              r="42"
              stroke={level === "High" ? "#ef4444" : level === "Medium" ? "#f59e0b" : "#10b981"}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 * (1 - score / 100)}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute flex flex-col items-center text-center">
            <span className="text-4xl font-extrabold text-white tracking-tight leading-none font-sans">
              {score}
            </span>
            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest mt-1">
              risk index
            </span>
          </div>
        </div>

        {/* Detailed Risk Gauges */}
        <div className="flex-1 space-y-4 w-full">
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-400 flex items-center gap-1.5 font-sans">
                <Activity size={13} className="text-indigo-400" />
                Targeting Confidence
                <div className="group relative">
                  <Info size={11} className="text-gray-500 cursor-pointer hover:text-gray-300" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#2a2f45] text-[10px] text-gray-200 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20 leading-relaxed font-sans font-normal">
                    How confidently ad trackers have categorized you based on the consistency of your browsing clusters.
                  </span>
                </div>
              </span>
              <span className="font-mono text-white font-medium">{confidence}%</span>
            </div>
            <div className="h-2 bg-[#1e2230] rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${confidence}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-400 flex items-center gap-1.5 font-sans">
                <Compass size={13} className="text-teal-400" />
                Identifiability Uniqueness
                <div className="group relative">
                  <Info size={11} className="text-gray-500 cursor-pointer hover:text-gray-300" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#2a2f45] text-[10px] text-gray-200 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20 leading-relaxed font-sans">
                    Niche, advanced, or technical domains (like developer APIs) make your web fingerprint highly distinct and easy to individualize.
                  </span>
                </div>
              </span>
              <span className="font-mono text-white font-medium">{uniqueness}%</span>
            </div>
            <div className="h-2 bg-[#1e2230] rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-500"
                style={{ width: `${uniqueness}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-400 flex items-center gap-1.5 font-sans">
                <Zap size={13} className="text-amber-400" />
                Tracker Exposure Rate
                <div className="group relative">
                  <Info size={11} className="text-gray-500 cursor-pointer hover:text-gray-300" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-[#2a2f45] text-[10px] text-gray-200 rounded shadow-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-20 leading-relaxed font-sans">
                    Statistical concentration of native advertising and analytic tags embedded in your visited domain categories.
                  </span>
                </div>
              </span>
              <span className="font-mono text-white font-medium">{trackerExposure}%</span>
            </div>
            <div className="h-2 bg-[#1e2230] rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${trackerExposure}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-gray-800/40 text-xs text-gray-400 italic flex items-start gap-2 leading-relaxed">
        <span className="text-indigo-400 font-semibold font-mono not-italic uppercase tracking-widest shrink-0 mt-0.5">Note:</span>
        Your developer logs expose deep behavioral metadata. Real-time advertising agents can fingerprint and reconstruct your job, skills, and exact buying budgets within 8-10 page queries.
      </div>
    </div>
  );
}
