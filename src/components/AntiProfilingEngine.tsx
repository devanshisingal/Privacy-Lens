import React, { useState, useEffect } from "react";
import { Copy, Check, Play, Square, Terminal, ShieldX, Sparkles, RefreshCw, Send, AlertTriangle } from "lucide-react";
import { DecoyRecommendation } from "../types";

interface AntiProfilingEngineProps {
  recommendations: DecoyRecommendation[];
  onTriggerDecoy: (domain: string) => Promise<void>;
  onRefreshRecommendations: () => Promise<void>;
  isLoading: boolean;
}

export default function AntiProfilingEngine({
  recommendations,
  onTriggerDecoy,
  onRefreshRecommendations,
  isLoading,
}: AntiProfilingEngineProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isRunningSpammer, setIsRunningSpammer] = useState<boolean>(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "Stealth Engine: Idle. Click 'Initialize Anti-Profiling Spammer' to generate anti-tracking noise.",
  ]);
  const [spammerInterval, setSpammerInterval] = useState<NodeJS.Timeout | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const addLog = (msg: string) => {
    setTerminalLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`].slice(-8)); // keep last 8 lines
  };

  // Run the Stealth Decoy Spammer routine
  const startSpammer = () => {
    if (recommendations.length === 0) return;
    setIsRunningSpammer(true);
    addLog("Stealth dilution handshake initialized...");
    addLog("Analyzing tracking concentrations...");
    addLog("Executing background random decoy web-visits...");

    let counter = 0;
    const interval = setInterval(async () => {
      // Pick random category
      const recoIndex = counter % recommendations.length;
      const reco = recommendations[recoIndex];
      
      const domainIndex = Math.floor(Math.random() * reco.suggestedDomains.length);
      const DomainToInject = reco.suggestedDomains[domainIndex];

      addLog(`[STEALTH] Simulating request to ${DomainToInject} (${reco.category})...`);
      
      try {
        await onTriggerDecoy(DomainToInject);
        addLog(`[SUCCESS] Exposed tracking to ${DomainToInject} -> profile diluted.`);
      } catch (err) {
        addLog(`[ERROR] Decoy injection timed out.`);
      }

      counter++;
    }, 4500); // add a decoy domain every 4.5 seconds

    setSpammerInterval(interval);
  };

  const stopSpammer = () => {
    if (spammerInterval) {
      clearInterval(spammerInterval);
      setSpammerInterval(null);
    }
    setIsRunningSpammer(false);
    addLog("Stealth dilution protocols halted. Engine idle.");
  };

  useEffect(() => {
    return () => {
      if (spammerInterval) clearInterval(spammerInterval);
    };
  }, [spammerInterval]);

  return (
    <div id="anti-profiling-engine-panel" className="bg-[#12141c] border border-gray-800/60 rounded-2xl p-6 shadow-xl hover:border-gray-700/85 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-md font-bold text-white flex items-center gap-2 font-sans tracking-tight">
            <ShieldX size={18} className="text-[#10b981]" />
            Anti-Profiling Dilution Engine
          </h3>
          <p className="text-xs text-gray-400 font-sans mt-0.5">
            Dilute technical tracking footprints by generating real consumer-baseline noise
          </p>
        </div>

        <button
          onClick={onRefreshRecommendations}
          disabled={isLoading}
          className="bg-[#1c202e] text-xs text-gray-350 px-3.5 py-1.5 rounded-lg border border-gray-800 hover:text-white hover:bg-[#24293a] flex items-center gap-1.5 font-semibold transition-all shrink-0"
        >
          <RefreshCw size={13} className={isLoading ? "animate-spin text-indigo-400" : ""} />
          AI Recalculate Decoys
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Dynamic Recommended list */}
        <div className="xl:col-span-7 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 font-mono">
            Strategic Decoy Vectors
          </p>

          {recommendations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 italic border border-dashed border-gray-800/80 rounded-xl space-y-1 bg-[#171a25]/20">
              <RefreshCw size={20} className="mx-auto text-gray-650 animate-spin mb-2" />
              <p>Analyzing profiles to calculate optimal decoy topics...</p>
            </div>
          ) : (
            recommendations.map((item, idx) => (
              <div
                key={idx}
                className="bg-[#161822] border border-gray-850 rounded-xl p-5 hover:border-gray-850 hover:bg-[#1a1c29]/70 transition-all"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-white font-sans flex items-center gap-1.5">
                    <Sparkles size={13} className="text-indigo-400" />
                    Decoy vector: {item.category}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-[#10b981] px-2 py-0.5 rounded bg-[#10b981]/10 border border-[#10b981]/20 font-mono">
                    High Dilution
                  </span>
                </div>

                <p className="text-xs text-gray-400 font-sans leading-relaxed">
                  {item.reason}
                </p>

                {/* Sub-actions: Suggested Domains */}
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] font-mono uppercase text-indigo-400 font-semibold tracking-wider">
                    Suggested Dilution URLs to Browse
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {item.suggestedDomains.map((domain) => (
                      <div
                        key={domain}
                        className="bg-[#1c202e] space-x-1 border border-gray-800 rounded px-2 py-1 text-xs text-gray-300 flex items-center font-mono hover:border-gray-700 hover:text-white hover:bg-slate-800 transition-all"
                      >
                        <span className="truncate max-w-[140px]">{domain}</span>
                        <button
                          onClick={() => handleCopy(domain)}
                          className="p-1 hover:text-indigo-400 border-l border-slate-700/60 pl-1 ml-1"
                          title="Copy domain"
                        >
                          {copiedText === domain ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sub-actions: Google Search strings */}
                <div className="mt-4 space-y-2">
                  <p className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">
                    Injectable Search Query strings
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {item.suggestedQueries.map((query) => (
                      <div
                        key={query}
                        className="bg-[#11121a] border border-gray-850 p-2 rounded flex items-center justify-between text-xs text-gray-300 hover:bg-[#151722]"
                      >
                        <span className="truncate italic font-sans pr-2">"{query}"</span>
                        <button
                          onClick={() => handleCopy(query)}
                          className="p-1 hover:text-indigo-400 text-gray-500"
                          title="Copy search query"
                        >
                          {copiedText === query ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* RIGHT ASPECT: Integrated stealth spammer console terminal */}
        <div className="xl:col-span-5 flex flex-col h-full bg-[#171a25]/40 border border-gray-800/80 rounded-xl p-5 overflow-hidden justify-between min-h-[350px]">
          <div>
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
              <span className="text-xs font-mono font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Terminal size={12} className="text-emerald-400" />
                Stealth Decoy Spammer Terminal
              </span>

              {isRunningSpammer ? (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Running
                </div>
              ) : (
                <div className="bg-gray-800/60 text-gray-400 border border-gray-700/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono">
                  Offline
                </div>
              )}
            </div>

            <p className="text-xs text-gray-400 font-sans leading-relaxed mb-4">
              Launches an automated background click worker simulating genuine target traffic to Recommended Decoys. This dilutes technical classifications live.
            </p>

            <div className="bg-black/90 rounded-lg p-3 font-mono text-[11px] text-emerald-400 space-y-1 h-[210px] overflow-y-auto shadow-inner border border-gray-850">
              <div className="text-gray-500 border-b border-gray-900 pb-1.5 mb-1.5 flex items-center justify-between">
                <span>SYSTEM LOG CONSOLE</span>
                <span>CTRL+C to halt</span>
              </div>
              {terminalLogs.map((log, i) => (
                <div key={i} className="leading-relaxed whitespace-pre-wrap">
                  {log}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-3 shrink-0">
            {isRunningSpammer ? (
              <button
                onClick={stopSpammer}
                className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 font-sans"
              >
                <Square size={13} />
                Halt Stealth Dilution Spammer
              </button>
            ) : (
              <button
                onClick={startSpammer}
                disabled={recommendations.length === 0}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold py-2 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed font-sans cursor-pointer shadow-lg shadow-emerald-950/20"
              >
                <Play size={13} fill="white" />
                Initialize Stealth Decoy Spammer
              </button>
            )}

            <div className="flex bg-yellow-500/5 border border-yellow-500/10 p-3 rounded-lg text-[10px] text-yellow-400 font-sans">
              <AlertTriangle size={15} className="shrink-0 mt-0.5 mr-2" />
              <span>
                <strong>How it works:</strong> The active spammer generates noise on the server every 4.5s. Keep the spammer running for 20-30s to watch the overall Privacy Risk Score drop on the dashboard!
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
