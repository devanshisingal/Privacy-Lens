import { useQuery } from "@tanstack/react-query";
import { Activity, TrendingDown } from "lucide-react";

interface DomainImpactRankingProps {
  userId: string;
}

export default function DomainImpactRanking({ userId }: DomainImpactRankingProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["telemetry", userId],
    queryFn: async () => {
      const res = await fetch(`/api/telemetry?userId=${userId}`);
      return res.json();
    },
    enabled: !!userId,
  });

  const shapValues = data?.shapValues || {};
  // Flatten and sort SHAP values to find top impacts across all profiles
  let topImpacts: { domain: string, profile: string, impact: number }[] = [];
  
  Object.entries(shapValues).forEach(([profile, impacts]: [string, any]) => {
    impacts.forEach((item: any) => {
      if (Math.abs(item.impact) > 0.05) { // Filter out negligible impacts
        topImpacts.push({ domain: item.feature, profile, impact: item.impact });
      }
    });
  });

  // Sort by absolute magnitude of impact
  topImpacts.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  // Deduplicate by domain (taking highest impact)
  const seen = new Set();
  topImpacts = topImpacts.filter(t => {
    if (seen.has(t.domain)) return false;
    seen.add(t.domain);
    return true;
  }).slice(0, 5);

  if (isLoading) {
    return (
      <div className="bg-[#171c2a] border border-gray-800/80 rounded-2xl p-6 shadow-xl flex items-center justify-center min-h-[300px]">
        <div className="animate-pulse flex items-center gap-2 text-indigo-400 font-mono text-xs uppercase tracking-wider">
          <Activity size={16} className="animate-spin" />
          <span>Analyzing SHAP attribution matrices...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#171c2a] border border-gray-800/80 rounded-2xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
          <TrendingDown className="text-indigo-400" size={18} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white font-sans tracking-tight">
            Explainable AI (SHAP)
          </h2>
          <p className="text-xs text-gray-500 font-sans mt-0.5">
            True feature attribution calculated via TreeExplainer
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {topImpacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm italic font-sans border border-dashed border-gray-700/50 rounded-xl">
            No significant SHAP attributions found.
          </div>
        ) : (
          topImpacts.map((item: any, index: number) => {
            const isPositive = item.impact > 0;
            const directionText = isPositive ? "strongly pushed toward" : "pulled away from";
            const colorClass = isPositive ? "text-emerald-400" : "text-blue-400";
            
            return (
              <div
                key={item.domain + item.profile}
                className="group flex flex-col p-3 rounded-xl bg-[#11141d] border border-gray-800/50 hover:border-indigo-500/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-1">
                   <div className="font-sans font-medium text-gray-300 group-hover:text-white transition-colors">
                     {item.domain}
                   </div>
                   <span className={`text-xs font-bold font-mono px-2 py-1 rounded bg-[#171c2a] border border-gray-800 ${colorClass}`}>
                     {(item.impact * 100).toFixed(1)}%
                   </span>
                </div>
                <div className="text-xs text-gray-500 italic">
                  {item.domain} {directionText} <span className="font-semibold text-gray-300">{item.profile}</span> label
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}