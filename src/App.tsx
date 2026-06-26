import React, { useState, useEffect, useCallback } from "react";
import { Shield, LayoutDashboard, Compass, Radio, AlertTriangle, HelpCircle, HardDriveDownload, Sparkles, RefreshCw } from "lucide-react";
import PrivacyScore from "./components/PrivacyScore";
import InterestChart from "./components/InterestChart";
import AdvertiserSimulator from "./components/AdvertiserSimulator";
import ExtensionSimulator from "./components/ExtensionSimulator";
import AntiProfilingEngine from "./components/AntiProfilingEngine";
import { BrowsingHistoryItem, PredictionState, DecoyRecommendation } from "./types";

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "simulator" | "anti-profiling">("dashboard");
  const [userId, setUserId] = useState<string>(() => localStorage.getItem("privacylens_user_id") || "user_devanshi1896");
  const [users, setUsers] = useState<Array<{ id: string; email: string }>>([]);
  const [history, setHistory] = useState<BrowsingHistoryItem[]>([]);
  const [predictions, setPredictions] = useState<PredictionState | null>(null);
  const [recommendations, setRecommendations] = useState<DecoyRecommendation[]>([]);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState<boolean>(false);
  const [aiEnhanced, setAiEnhanced] = useState<boolean>(true);

  // Sync userId with localStorage
  useEffect(() => {
    localStorage.setItem("privacylens_user_id", userId);
  }, [userId]);

  // Sync userId if extension's content script tells us it updated
  useEffect(() => {
    const handleSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail !== userId) {
        setUserId(detail);
      }
    };
    window.addEventListener("privacylens_id_synced", handleSync);
    return () => {
      window.removeEventListener("privacylens_id_synced", handleSync);
    };
  }, [userId]);

  // Fetch list of active users in the db
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error("Error fetching users list", error);
    }
  }, []);

  // Fetch telemetry state from backend for active userId
  const fetchTelemetry = useCallback(async (uid: string) => {
    try {
      const response = await fetch(`/api/telemetry?userId=${uid}`);
      const data = await response.json();
      setHistory(data.history || []);
      setPredictions({
        userId: data.userId,
        interests: data.interests || {},
        profiles: data.profiles || {},
        shapValues: data.shapValues || {},
        risk: data.risk || { score: 10, level: "Low", confidence: 10, uniqueness: 10, trackerExposure: 10 }
      });
    } catch (error) {
      console.error("Error fetching telemetry", error);
    }
  }, []);

  // Fetch decoy recommendations for active userId
  const fetchRecommendations = useCallback(async (uid: string) => {
    setIsLoadingRecommendations(true);
    try {
      const response = await fetch(`/api/recommendations?userId=${uid}`);
      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Error fetching recommendations", error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  }, []);

  // Set up initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await fetchUsers();
      await fetchTelemetry(userId);
      await fetchRecommendations(userId);
      setIsLoading(false);
    };
    init();
  }, [userId, fetchTelemetry, fetchRecommendations, fetchUsers]);

  // Real-time polling
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchTelemetry(userId);
        fetchUsers();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [userId, fetchTelemetry, fetchUsers]);

  // Navigate simulated active tab URL
  const handleNavigate = async (domain: string) => {
    setIsNavigating(true);
    try {
      const response = await fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, userId }),
      });
      const data = await response.json();
      
      // Update local states
      if (data.item) {
        setHistory((prev) => [data.item, ...prev]);
      }
      if (data.predictions) {
        setPredictions({
          userId: data.predictions.userId,
          interests: data.predictions.interests || {},
          profiles: data.predictions.profiles || {},
          shapValues: data.predictions.shapValues || {},
          risk: data.predictions.risk || predictions?.risk
        });
      }
      await fetchUsers();
    } catch (error) {
      console.error("Navigation error", error);
    } finally {
      setIsNavigating(false);
    }
  };

  // Delete a specific tracking line
  const handleDeleteItem = async (id: string) => {
    try {
      const response = await fetch(`/api/history/${id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      
      setHistory((prev) => prev.filter((item) => item.id !== id));
      if (data.predictions) {
        setPredictions({
          userId: data.predictions.userId,
          interests: data.predictions.interests || {},
          profiles: data.predictions.profiles || {},
          shapValues: data.predictions.shapValues || {},
          risk: data.predictions.risk
        });
      }
    } catch (error) {
      console.error("Delete history error", error);
    }
  };

  // Reset sandbox to baseline seeds
  const handleResetDB = async () => {
    try {
      const response = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const data = await response.json();
      setHistory(data.history || []);
      if (data.predictions) {
        setPredictions({
          userId: data.predictions.userId,
          interests: data.predictions.interests || {},
          profiles: data.predictions.profiles || {},
          shapValues: data.predictions.shapValues || {},
          risk: data.predictions.risk
        });
      }
      await fetchRecommendations(userId);
    } catch (error) {
      console.error("Reset DB error", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#c5c6c7] font-sans flex flex-col antialiased">
      {/* Top Console Navigation bar */}
      <header className="bg-[#10131d] border-b border-gray-800/80 px-6 py-4 sticky top-0 z-30 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-600/20">
              <Shield size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-white tracking-tight font-sans">
                  PrivacyLens
                </h1>
                <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-1.5 py-0.5 rounded leading-none">ALPHA</span>
              </div>
              <p className="text-xs text-gray-400 font-sans mt-0.5">
                AI Tracking Observatory & Anti-Profiling Sandbox
              </p>
            </div>
          </div>

          {/* Selector Tabs */}
          <div className="flex bg-[#161a25] border border-gray-800/80 rounded-xl p-1 shrink-0 self-start md:self-auto">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === "dashboard"
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <LayoutDashboard size={14} />
              Threat Observatory
            </button>
            <button
              onClick={() => setActiveTab("simulator")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === "simulator"
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Compass size={14} />
              Extension Simulator
            </button>
            <button
              onClick={() => setActiveTab("anti-profiling")}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                activeTab === "anti-profiling"
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/10"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              <Radio size={14} />
              Anti-Profiling Engine
            </button>
          </div>

          {/* AI Settings & User Selector Trigger */}
          <div className="flex items-center gap-3 self-end md:self-auto flex-wrap justify-end">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 font-mono uppercase tracking-wider hidden lg:inline">Active Session:</span>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="bg-[#161a25] border border-gray-800 text-xs font-semibold text-white px-3 py-1.5 rounded-xl focus:border-indigo-500/50 outline-none cursor-pointer hover:bg-[#1c2230] transition-all"
              >
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.id === "user_devanshi1896" ? "Devanshi (Seed Demo)" : u.id}
                  </option>
                ))}
                {!users.find(u => u.id === userId) && (
                  <option value={userId}>{userId} (Active Session)</option>
                )}
              </select>
            </div>

            <div className="flex items-center gap-2 border border-gray-800 bg-[#0f1118] px-3 py-1.5 rounded-xl">
              <Sparkles size={13} className={aiEnhanced ? "text-yellow-400" : "text-gray-500"} />
              <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-300">
                AI Enhanced classification
              </span>
              <span className="text-[9px] bg-indigo-500/15 text-indigo-400 font-semibold px-1 rounded uppercase">Live</span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-8">
        
        {/* Connection status overlay */}
        <div className="bg-[#171c2a] border border-indigo-500/15 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={18} />
            <div>
              <p className="text-xs font-bold text-white font-sans">
                Active Tracking Footprint Detected for <span className="text-indigo-300 font-mono">{userId === "user_devanshi1896" ? "devanshi1896@gmail.com" : `${userId}@privacylens.local`}</span>
              </p>
              <p className="text-[11px] text-gray-400 font-sans mt-0.5 leading-relaxed">
                Ad routers have aggregated your footprint clusters across {history.length} distinct domains. Your metadata contains heavily categorized corporate bias.
              </p>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleResetDB}
              className="bg-[#1f2436] hover:bg-[#282f45] border border-gray-800 text-[11px] font-bold text-gray-300 py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 font-sans"
            >
              <RefreshCw size={12} className="text-gray-400" />
              Re-seed Historical Logs
            </button>
          </div>
        </div>

        {/* Global Loading Spinner */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="animate-spin text-indigo-500 mx-auto" size={32} />
            <p className="text-sm font-sans text-gray-400">Loading PrivacyLens metrics telemetry...</p>
          </div>
        ) : (
          <div className="transition-all duration-300">
            
            {/* TAB 1: Main Observatory Dashboard */}
            {activeTab === "dashboard" && predictions && (
              <div className="space-y-8">
                {/* Score Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-5">
                    <PrivacyScore
                      score={predictions.risk.score}
                      level={predictions.risk.level}
                      confidence={predictions.risk.confidence}
                      uniqueness={predictions.risk.uniqueness}
                      trackerExposure={predictions.risk.trackerExposure}
                    />
                  </div>
                  <div className="lg:col-span-7">
                    <InterestChart interests={predictions.interests} />
                  </div>
                </div>

                {/* Advertiser Simulation Panel */}
                <AdvertiserSimulator
                  profiles={predictions.profiles}
                  shapValues={predictions.shapValues}
                  userId={userId}
                />
              </div>
            )}

            {/* TAB 2: Live Browser and extension mockup */}
            {activeTab === "simulator" && (
              <ExtensionSimulator
                history={history}
                onNavigate={handleNavigate}
                onDeleteItem={handleDeleteItem}
                onResetDB={handleResetDB}
                isNavigating={isNavigating}
              />
            )}

            {/* TAB 3: Strategic Decoy dilution panels */}
            {activeTab === "anti-profiling" && (
              <AntiProfilingEngine
                recommendations={recommendations}
                onTriggerDecoy={handleNavigate}
                onRefreshRecommendations={fetchRecommendations}
                isLoading={isLoadingRecommendations}
              />
            )}

          </div>
        )}

      </main>

      {/* Cyber Security footer info */}
      <footer className="bg-[#0b0c10] border-t border-gray-800/50 py-6 px-6 text-center text-xs text-gray-500 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 font-mono">
          <p>© {new Date().getUTCFullYear()} PrivacyLens Foundation. Dedicated to behavioral tracking obfuscation.</p>
          <div className="flex items-center gap-4 text-indigo-400">
            <a href="#" className="hover:underline">obfuscate-api</a>
            <a href="#" className="hover:underline">chrome-sim-local</a>
            <a href="#" className="hover:underline">xgboost-explanations</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
