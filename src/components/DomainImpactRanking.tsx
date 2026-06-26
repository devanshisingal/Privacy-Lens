import { useQuery } from "@tanstack/react-query";
import { Activity, TrendingDown } from "lucide-react";

interface DomainImpactRankingProps {
  userId: string;
}

export default function DomainImpactRanking({ userId }: DomainImpactRankingProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["domain-impact", userId],
    queryFn: async () => {
      const res = await fetch(`/api/domain-impact?userId=${userId}`);
      return res.json();
    },
    enabled: !!userId,
  });

  const impacts = data?.impacts || [];

  if (isLoading) {
    return (
      <div className="bg-[#171c2a] border border-gray-800/80 rounded-2xl p-6 shadow-xl flex items-center justify-center min-h-[300px]">
        <div className="animate-pulse flex items-center gap-2 text-indigo-400 font-mono text-xs uppercase tracking-wider">
          <Activity size={16} className="animate-spin" />
          <span>Analyzing impact matrices...</span>
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
            Top Profiling Contributors
          </h2>
          <p className="text-xs text-gray-500 font-sans mt-0.5">
            Counterfactual analysis: Risk reduction if domain was removed
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {impacts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm italic font-sans border border-dashed border-gray-700/50 rounded-xl">
            No browsing history available to analyze.
          </div>
        ) : (
          impacts.map((item: any, index: number) => (
            <div
              key={item.domain}
              className="group flex items-center justify-between p-3 rounded-xl bg-[#11141d] border border-gray-800/50 hover:border-indigo-500/30 transition-all duration-300"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-gray-800/50 text-gray-400 text-xs font-mono font-bold group-hover:text-indigo-300 group-hover:bg-indigo-500/10 transition-colors">
                  {index + 1}
                </div>
                <div className="font-sans font-medium text-gray-300 group-hover:text-white transition-colors">
                  {item.domain}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider hidden sm:block">
                  Risk Delta:
                </span>
                <span className={`text-xs font-bold font-mono px-2 py-1 rounded bg-[#171c2a] border border-gray-800 ${item.riskReduction > 0 ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : 'text-gray-400'}`}>
                  -{item.riskReduction} pts
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}