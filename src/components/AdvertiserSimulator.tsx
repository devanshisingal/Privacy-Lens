import React, { useState } from "react";
import { Users2, Sliders, ChevronDown, ChevronUp, AlertCircle, Info, Sparkles } from "lucide-react";
import DomainImpactRanking
from "./DomainImpactRanking";

interface SHAPFeature {
  feature: string;
  impact: number;
}

interface AdvertiserSimulatorProps {
  profiles: Record<string, number>;
  shapValues: Record<string, SHAPFeature[]>;
  userId: string;
}

export default function AdvertiserSimulator({ profiles, shapValues, userId }: AdvertiserSimulatorProps) {
  const [selectedProfile, setSelectedProfile] = useState<string>("Developer");

  const getProfileDescription = (profile: string) => {
    switch (profile) {
      case "Developer":
        return "Software engineers, systems architects, and technical creators. Highly prized for enterprise cloud budgets, productivity tools, and computer hardware.";
      case "Gamer":
        return "Enthusiasts of console and pc gaming ecosystem. Targets include high-performance GPUs, energy drinks, gaming laptops, and game store launches.";
      case "TechBuyer":
        return "Corporate decision-makers, smart home enthusiasts, and early adopters. Prime target for consumer IoT, SaaS productivity tooling, and premium electronics.";
      case "Student":
        return "Young academic demographic looking for e-learning platforms, budget lifestyle goods, laptops, student discounts, and digital convenience.";
      case "CryptoEnthusiast":
        return "Web3, decentralized finance, and crypto asset traders. High-risk tolerance buyers targeted by trading exchanges, hardware wallets, and yield products.";
      case "LifestyleBuyer":
        return "Premium consumers tracking cooking recipes, high-end travel flights, local getaways, and luxury cookware, indicating solid disposable income.";
      default:
        return "Standard tracking baseline. Categorized into broad consumer segments.";
    }
  };

  const getProfileBadgeColor = (val: number) => {
    if (val >= 0.75) return "bg-red-500/10 text-red-400 border border-red-500/30";
    if (val >= 0.4) return "bg-amber-500/10 text-amber-400 border border-amber-500/30";
    return "bg-slate-500/10 text-slate-400 border border-slate-500/20";
  };

  return (
    <div id="advertiser-simulator-box" className="bg-[#12141c] border border-gray-800/60 rounded-2xl p-6 shadow-xl hover:border-gray-700/85 transition-all">
      <div className="flex items-center gap-2.5 mb-6">
        <Users2 className="text-[#3b82f6]" size={20} />
        <div>
          <h3 className="text-md font-bold text-white font-sans tracking-tight">
            Advertiser Audience Simulator
          </h3>
          <p className="text-xs text-gray-400 font-sans">
            AI-modeled persona targeting based on your tracking footprint
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile targeting probabilities list */}
        <div className="lg:col-span-7 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono mb-2">
            Targeting Confidence Index
          </p>
          {Object.entries(profiles).map(([profile, value]) => {
            const isSelected = selectedProfile === profile;
            const percentage = Math.round(value * 100);

            return (
              <div
                key={profile}
                onClick={() => setSelectedProfile(profile)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-[#1e2230] border-indigo-500/50 shadow-md ring-1 ring-indigo-500/10"
                    : "bg-[#161922] border-gray-800/60 hover:bg-[#1c1f2b] hover:border-gray-700/50"
                }`}
              >
                <div id={`profile-${profile}`} className="flex items-center justify-between gap-3 mb-2">
                  <span className="font-semibold text-sm text-gray-200 font-sans">
                    {profile} Audience
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-xs font-mono rounded ${getProfileBadgeColor(value)}`}>
                      {percentage <= 30 ? "Unlikely" : percentage <= 75 ? "Target" : "High Value"}
                    </span>
                    <span className="text-sm font-extrabold text-white font-mono shrink-0">
                      {(value * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="h-1.5 bg-[#0f111a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500"
                    style={{ width: `${value * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected profile explainability and SHAP metrics */}
        <div className="lg:col-span-5 bg-[#171a25] border border-gray-800/50 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-3">
              <span className="text-xs font-mono font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Sliders size={12} />
                SHAP Explainer Insights
              </span>
              <div className="flex items-center gap-1.5 text-[10px] bg-slate-800/40 text-slate-400 px-2 py-0.5 rounded font-mono border border-slate-700/20">
                <Sparkles size={10} className="text-yellow-400" />
                Active Model Output
              </div>
            </div>

            <h4 className="text-md font-bold text-white font-sans mt-2">
              {selectedProfile} Attribution
            </h4>
            <p className="text-xs text-gray-400 font-sans mt-1 leading-relaxed">
              {getProfileDescription(selectedProfile)}
            </p>

            {/* Feature impact list resembling real SHAP tree visualizers */}
            <div className="mt-5 space-y-3.5">
              <p className="text-[10px] font-mono uppercase tracking-wider text-gray-500">
                Major Attribution Coefficients (TreeExplainer)
              </p>

              {shapValues[selectedProfile] && shapValues[selectedProfile].length > 0 ? (
                shapValues[selectedProfile].map((item, idx) => {
                  const isBaseline = item.feature.includes("Constant") || item.feature.includes("Baseline");
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`font-sans truncate ${isBaseline ? "text-gray-500 italic" : "text-gray-300 font-medium"}`}>
                          {item.feature}
                        </span>
                        <span className={`font-mono font-semibold ${isBaseline ? "text-gray-400" : "text-emerald-400"}`}>
                          +{item.impact.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1 bg-[#10121a] rounded overflow-hidden">
                        <div
                          className={`h-full rounded ${isBaseline ? "bg-gray-600" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(100, item.impact * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs text-gray-500 italic flex items-center gap-1.5 py-4">
                  <AlertCircle size={12} />
                  No tracking footprint matches other feature attributions.
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-gray-800/40 text-[10px] text-gray-500 italic">
            XGBoost outputs probabilities via <code className="bg-[#11131c] text-indigo-300 px-1 py-0.5 rounded text-[9px] font-mono">predict_proba()</code> based on high-order feature cross products.
          </div>
        </div>
      </div>
      <DomainImpactRanking userId={userId} />
    </div>
  );
}
