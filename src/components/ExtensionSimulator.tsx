import React, { useState } from "react";
import { ArrowLeft, ArrowRight, RotateCw, Globe, Search, Trash2, Shield, Plus, Database, AlertCircle, Sparkles } from "lucide-react";
import { BrowsingHistoryItem } from "../types";

interface ExtensionSimulatorProps {
  history: BrowsingHistoryItem[];
  onNavigate: (domain: string) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onResetDB: () => Promise<void>;
  isNavigating: boolean;
}

export default function ExtensionSimulator({
  history,
  onNavigate,
  onDeleteItem,
  onResetDB,
  isNavigating,
}: ExtensionSimulatorProps) {
  const [customUrl, setCustomUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("github.com");
  const [activeCategory, setActiveCategory] = useState<string>("Programming");

  const PRESETS = [
    { title: "ChatGPT", url: "chatgpt.com", category: "AI / ML" },
    { title: "GitHub Copilot", url: "github.com", category: "Programming" },
    { title: "LeetCode", url: "leetcode.com", category: "Programming" },
    { title: "Twitch", url: "twitch.tv", category: "Gaming" },
    { title: "Robinhood", url: "robinhood.com", category: "Finance" },
    { title: "Netflix", url: "netflix.com", category: "Entertainment" },
    { title: "BBC News", url: "bbc.co.uk", category: "General Search & News" },
    { title: "AllRecipes", url: "allrecipes.com", category: "Cooking" },
  ];

  const handleVisit = async (url: string) => {
    if (!url.trim()) return;
    let cleanUrl = url.trim();
    if (cleanUrl.startsWith("http://")) cleanUrl = cleanUrl.substring(7);
    if (cleanUrl.startsWith("https://")) cleanUrl = cleanUrl.substring(8);
    const host = cleanUrl.split("/")[0];

    setActiveTab(host);
    
    // Simple lookups to instantly sync visual indicator
    const matchedPreset = PRESETS.find(p => host.includes(p.url));
    setActiveCategory(matchedPreset ? matchedPreset.category : "Computing General");

    await onNavigate(url);
    setCustomUrl("");
  };

  const currentLocalCount = history.length;

  return (
    <div id="extension-simulator-section" className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* LEFT ASPECT: Simulated Browser sandbox */}
      <div className="xl:col-span-8 space-y-6">
        <div className="bg-[#12141c] border border-gray-800/80 rounded-2xl overflow-hidden shadow-2xl">
          {/* Simulated Mac/Generic window header */}
          <div className="bg-[#191c28] border-b border-gray-800 p-3.5 flex items-center gap-3">
            <div className="flex gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-red-500/20 block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/20 block" />
              <span className="w-3 h-3 rounded-full bg-green-500/20 block" />
            </div>

            {/* Address controls */}
            <div className="flex items-center gap-3 text-gray-500 shrink-0">
              <ArrowLeft size={16} className="cursor-not-allowed text-gray-700" />
              <ArrowRight size={16} className="cursor-not-allowed text-gray-700" />
              <RotateCw size={15} className="hover:text-gray-300 cursor-pointer" />
            </div>

            {/* Simulated browser search input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVisit(customUrl);
              }}
              className="flex-1 max-w-xl flex items-center bg-[#0f111a] border border-gray-800/60 rounded-lg px-3 py-1.5 gap-2 group focus-within:border-indigo-500/50 transition-all"
            >
              <Globe size={14} className="text-gray-500 group-focus-within:text-indigo-400" />
              <input
                type="text"
                placeholder="simulated-browser.local/search?q=..."
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="bg-transparent text-gray-200 outline-none w-full text-xs font-sans"
              />
              <button type="submit" disabled={isNavigating}>
                <Plus size={14} className="text-indigo-400 hover:text-indigo-300" />
              </button>
            </form>

            <div className="shrink-0 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase hidden sm:inline">Active Link</span>
            </div>
          </div>

          {/* Preset trigger section */}
          <div className="p-6 bg-[#161a25]/40 border-b border-gray-800/50">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 font-mono">
              Demo Browsing Sandboxes
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.url}
                  onClick={() => handleVisit(preset.url)}
                  disabled={isNavigating}
                  className="bg-[#1c202e] border border-gray-850/50 hover:border-gray-700 hover:bg-[#23283a] p-2.5 rounded-xl text-left transition-all group shrink-0"
                >
                  <p className="text-xs font-bold text-white group-hover:text-indigo-300 truncate font-sans">
                    {preset.title}
                  </p>
                  <p className="text-[9px] text-gray-500 font-mono truncate mt-0.5">
                    {preset.url} • {preset.category}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Browsing Data footprint display */}
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="text-sm font-bold text-gray-200 flex items-center gap-1.5 font-sans">
                  Current Session Footprint Logs
                </h4>
                <p className="text-xs text-gray-500 font-sans mt-0.5">
                  These tracking lines feed into advertiser profiling classifiers
                </p>
              </div>

              <button
                onClick={onResetDB}
                className="bg-[#1c202e] text-xs text-gray-300 hover:text-white px-3 py-1.5 rounded-lg border border-gray-800 hover:bg-slate-800 hover:border-gray-700 font-semibold flex items-center gap-1.5 font-sans flex-shrink-0"
              >
                <RotateCw size={13} />
                Reset Sandbox Logs
              </button>
            </div>

            <div className="border border-gray-800/60 rounded-xl overflow-hidden bg-[#0f1118]">
              {history.length === 0 ? (
                <div className="p-8 text-center text-gray-500 text-xs italic space-y-1">
                  <Database size={24} className="mx-auto text-gray-600 mb-2" />
                  <p>Your local browsing history is empty.</p>
                  <p className="text-[10px]">Use the address input above to simulate target hits.</p>
                </div>
              ) : (
                <div className="max-h-[220px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#171a24] text-gray-400 border-b border-gray-800 text-[10px] font-mono uppercase tracking-wider">
                        <th className="p-3">Visited Domain</th>
                        <th className="p-3">Matched Category</th>
                        <th className="p-3">Timestamp</th>
                        <th className="p-3 text-right">Privacy Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850/40">
                      {history.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-800/10">
                          <td className="p-3 font-semibold text-gray-200 font-sans max-w-[150px] truncate">
                            {item.domain}
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] px-2 py-0.5 rounded font-mono bg-indigo-500/5 border border-indigo-500/10 text-indigo-400">
                              {item.category}
                            </span>
                          </td>
                          <td className="p-3 text-[10px] text-gray-400 font-mono">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => onDeleteItem(item.id)}
                              className="text-gray-500 hover:text-red-400 p-1.5 rounded transition-all inline-block hover:bg-red-500/10"
                              title="Delete log"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT ASPECT: Chrome extension popup mockup */}
      <div className="xl:col-span-4 bg-[#14151f] border border-gray-800 rounded-2xl p-5 shadow-2xl relative flex flex-col justify-between h-fit self-start">
        <div>
          {/* Header design mimicking chrome toolbar environment */}
          <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600/20 border border-indigo-500/40 p-1.5 rounded-lg text-indigo-400">
                <Shield size={16} />
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-white font-sans tracking-wide">
                  PrivacyLens v1.0.2
                </h4>
                <p className="text-[10px] text-gray-400 font-mono">Chrome Extension Popup</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">Active Sniffing</span>
            </div>
          </div>

          {/* Active Tab Detector module (chrome.tabs.onUpdated) */}
          <div className="bg-[#1d202d] border border-gray-850 rounded-xl p-4 mb-4 space-y-3.5">
            <div>
              <p className="text-[9px] font-mono uppercase text-indigo-400 tracking-wider font-bold">
                Captured Active Tab
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <Globe size={14} className="text-gray-400 shrink-0" />
                <span className="text-xs text-white font-semibold font-mono truncate">
                  {activeTab}
                </span>
              </div>
            </div>

            <div>
              <p className="text-[9px] font-mono uppercase text-gray-400 tracking-wider">
                Predicted Active Category
              </p>
              <span className="inline-block mt-1.5 text-xs font-semibold px-2 py-0.5 rounded bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 font-sans">
                {activeCategory}
              </span>
            </div>
          </div>

          {/* Storage telemetry status (chrome.storage.local) */}
          <div className="bg-[#171924]/60 border border-gray-800/40 rounded-xl p-4 mb-4 space-y-3">
            <p className="text-[9px] font-mono uppercase text-gray-500 tracking-wider">
              chrome.storage.local State
            </p>

            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-gray-400">Stored Domains</span>
              <span className="font-mono text-gray-200 font-bold">{currentLocalCount} unique</span>
            </div>

            <div className="flex items-center justify-between text-xs font-sans">
              <span className="text-gray-400">Sandbox Sync Status</span>
              <span className="text-indigo-400 font-semibold font-sans flex items-center gap-1">
                Synced to Model
              </span>
            </div>
          </div>

          {/* Warning panel about corporate analytics tracking */}
          <div className="p-3.5 rounded-xl bg-amber-500/5 text-amber-400 border border-amber-500/15 text-[10px] leading-relaxed font-sans flex gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Privacy Alert:</span> Multiple ad brokers like Google AdSense and DoubleClick map this active tab domain to your permanent fingerprint database ID in {new Date().getUTCFullYear()}!
            </div>
          </div>
        </div>

        <div className="mt-6 pt-3.5 border-t border-gray-800/60 flex items-center justify-between text-[10px] text-gray-500 flex-shrink-0">
          <span className="font-mono">ID: {history[0]?.id || "fsg32ks"}</span>
          <span className="text-indigo-400 flex items-center gap-1">
            <Sparkles size={10} className="text-yellow-400" />
            AI Shield Active
          </span>
        </div>
      </div>
    </div>
  );
}
