import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { execSync, spawn } from "child_process";
import {
 findBestNoise
}
from "./backend/optimizer";
import cors from "cors";
          
let pythonServerProcess: any = null;

function startPythonModelServer() {
  console.log("Starting Python model server (backend/model_server.py)...");
  pythonServerProcess = spawn("python3", ["backend/model_server.py"]);

  pythonServerProcess.stdout.on("data", (data: any) => {
    console.log(`[Python Model Server]: ${data.toString().trim()}`);
  });

  pythonServerProcess.stderr.on("data", (data: any) => {
    console.error(`[Python Model Server Error]: ${data.toString().trim()}`);
  });

  pythonServerProcess.on("close", (code: number) => {
    console.log(`Python model server exited with code ${code}`);
  });

  // Ensure python process is killed on node exit
  process.on("exit", () => {
    if (pythonServerProcess) pythonServerProcess.kill();
  });
  process.on("SIGINT", () => {
    if (pythonServerProcess) pythonServerProcess.kill();
    process.exit();
  });
}



dotenv.config();

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Lowdb-like simple JSON database persistence
const DB_FILE = path.join(process.cwd(), "database.json");

interface DBStore {
  users: Array<{ id: string; email: string; createdAt: string }>;
  history: Array<{ id: string; userId: string; domain: string; category: string; timestamp: string }>;
  predictions: Record<string, any>;
}

const DEFAULT_USER_ID = "user_devanshi1896";
const DEFAULT_USER_EMAIL = "devanshi1896@gmail.com";

const SEED_HISTORY = [
  { id: "h1", userId: DEFAULT_USER_ID, domain: "github.com", category: "Programming", timestamp: new Date(Date.now() - 3600000 * 8).toISOString() },
  { id: "h2", userId: DEFAULT_USER_ID, domain: "leetcode.com", category: "Programming", timestamp: new Date(Date.now() - 3600000 * 7).toISOString() },
  { id: "h3", userId: DEFAULT_USER_ID, domain: "stackoverflow.com", category: "Programming", timestamp: new Date(Date.now() - 3600000 * 6).toISOString() },
  { id: "h4", userId: DEFAULT_USER_ID, domain: "python.org", category: "Programming", timestamp: new Date(Date.now() - 3600000 * 5).toISOString() },
  { id: "h5", userId: DEFAULT_USER_ID, domain: "openai.com", category: "AI / ML", timestamp: new Date(Date.now() - 3600000 * 4.5).toISOString() },
  { id: "h6", userId: DEFAULT_USER_ID, domain: "huggingface.co", category: "AI / ML", timestamp: new Date(Date.now() - 3600000 * 4).toISOString() },
  { id: "h7", userId: DEFAULT_USER_ID, domain: "espn.com", category: "Sports", timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
  { id: "h8", userId: DEFAULT_USER_ID, domain: "netflix.com", category: "Entertainment", timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
  { id: "h9", userId: DEFAULT_USER_ID, domain: "amazon.com", category: "Shopping", timestamp: new Date(Date.now() - 3600000 * 1).toISOString() }
];

function readDB(): DBStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading database file, using defaults", error);
  }

  const initialDB: DBStore = {
    users: [{ id: DEFAULT_USER_ID, email: DEFAULT_USER_EMAIL, createdAt: new Date().toISOString() }],
    history: SEED_HISTORY,
    predictions: {}
  };
  writeDB(initialDB);
  return initialDB;
}

function writeDB(data: DBStore) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to database file", error);
  }
}

interface ModelServerResponse {
  interests: Record<string, number>;
  profiles: Record<string, number>;
  risk: number;
  shapValues: Record<string, any>;
}

async function queryModelServer(
  historyText: string,
  confidence: number = 0,
  uniqueness: number = 0,
  exposure: number = 0
): Promise<ModelServerResponse> {
  try {
    const response = await fetch("http://127.0.0.1:5001/predict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        historyText,
        confidence,
        uniqueness,
        exposure,
      }),
    });
    if (!response.ok) {
      throw new Error(`Model server returned status ${response.status}`);
    }
    return await response.json() as ModelServerResponse;
  } catch (error) {
    console.error("Failed to query Python model server, using fallback:", error);
    return {
      interests: {
        "Programming": 0.05,
        "AI / ML": 0.05,
        "Gaming": 0.05,
        "Social Media": 0.05,
        "Finance": 0.05,
        "Entertainment": 0.05,
        "Sports": 0.05,
        "Shopping": 0.05,
        "Cooking": 0.05,
        "Travel": 0.05,
        "Photography": 0.05,
        "Gardening": 0.05,
        "General Search & News": 0.05
      },
      profiles: {
        Developer: 0.2,
        Gamer: 0.2,
        Student: 0.2,
        TechBuyer: 0.2,
        CryptoEnthusiast: 0.1,
        LifestyleBuyer: 0.1
      },
      risk: 50,
      shapValues: {
        Developer: [],
        Gamer: [],
        Student: [],
        TechBuyer: [],
        CryptoEnthusiast: [],
        LifestyleBuyer: []
      }
    };
  }
}

// Standard baseline rule-based categorization
function categorizeDomainOffline(domain: string): string {
  const d = domain.toLowerCase().trim();
  if (d.includes("github.com") || d.includes("github.io") || d.includes("gitlab.com")) return "Programming";
  if (d.includes("leetcode.com") || d.includes("hackerrank.com") || d.includes("codewars.com")) return "Programming";
  if (d.includes("stackoverflow.com") || d.includes("stackexchange.com")) return "Programming";
  if (d.includes("python.org") || d.includes("typescriptlang.org") || d.includes("npmjs.com") || d.includes("rust-lang")) return "Programming";
  if (d.includes("aws.") || d.includes("console.aws") || d.includes("google.cloud") || d.includes("supabase.co") || d.includes("vercel.com")) return "Programming";
  
  if (d.includes("openai.com") || d.includes("chatgpt.com") || d.includes("claude.ai") || d.includes("anthropic.com")) return "AI / ML";
  if (d.includes("huggingface.co") || d.includes("replicate.com") || d.includes("deepmind.com") || d.includes("cohere.com")) return "AI / ML";
  if (d.includes("midjourney.com") || d.includes("stability.ai")) return "AI / ML";

  if (d.includes("steam") || d.includes("steampowered.com") || d.includes("epicgames.com") || d.includes("riotgames.com") || d.includes("valorant")) return "Gaming";
  if (d.includes("twitch.tv") || d.includes("discord.com") || d.includes("roblox.com") || d.includes("ign.com") || d.includes("kotaku.com")) return "Gaming";

  if (d.includes("youtube.com") || d.includes("youtu.be") || d.includes("netflix.com") || d.includes("spotify.com") || d.includes("disneyplus.com") || d.includes("hulu.com")) return "Entertainment";

  if (d.includes("espn.com") || d.includes("nba.com") || d.includes("nfl.com") || d.includes("sports.yahoo.com") || d.includes("bleacherreport.com")) return "Sports";

  if (d.includes("twitter.com") || d.includes("x.com") || d.includes("instagram.com") || d.includes("instagr.am") || d.includes("tiktok.com") || d.includes("facebook.com") || d.includes("linkedin.com")) return "Social Media";

  if (d.includes("amazon.com") || d.includes("ebay.com") || d.includes("target.com") || d.includes("walmart.com") || d.includes("aliexpress.com") || d.includes("shopify.com")) return "Shopping";

  if (d.includes("fidelity.com") || d.includes("robinhood.com") || d.includes("coinbase.com") || d.includes("bloomberg.com") || d.includes("chase.com") || d.includes("paypal.com")) return "Finance";

  if (d.includes("recipe") || d.includes("cooking.com") || d.includes("foodnetwork.com") || d.includes("allrecipes.com") || d.includes("seriouseats.com")) return "Cooking";
  if (d.includes("travel") || d.includes("expedia.com") || d.includes("airbnb.com") || d.includes("booking.com") || d.includes("lonelyplanet.com")) return "Travel";
  if (d.includes("camera") || d.includes("photography") || d.includes("dpreview.com") || d.includes("unsplash.com") || d.includes("flickr.com")) return "Photography";
  if (d.includes("gardening") || d.includes("gardeners.com") || d.includes("royalhorticultural.org") || d.includes("backyardgardener.com")) return "Gardening";

  return "General Search & News";
}

// Predict domain category with Gemini or fallback
async function predictCategory(domain: string): Promise<string> {
  if (!ai) {
    return categorizeDomainOffline(domain);
  }
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Categorize the domain "${domain}" into exactly one of these pre-defined categories based on its primary function or typical advertiser relevance:
- Programming (coding tools, developer services like Github, Stackoverflow)
- AI / ML (artificial intelligence, machine learning tools like OpenAI, Claude, HuggingFace)
- Gaming (steam, console games, twitch, esports)
- Social Media (twitter, reddit, instagram, etc.)
- Finance (banking, stock trading, crypto like robinhood, coinbase, fidelity)
- Entertainment (streaming, music, youtube, netflix)
- Sports (news, scores, leagues like espn)
- Shopping (retailers like amazon, target)
- Cooking (recipe blogs, kitchen apps)
- Travel (flights, hotels, trip planners)
- Photography (cameras, editing software, image bases)
- Gardening (plants, yards, agricultural logs)
- General Search & News (generic search engines, news publishers like nytimes, wikipedia)

Respond with ONLY the name of the category (e.g. "Programming", "AI / ML", "Social Media", etc.). Do not include punctuation, explanations, or any other characters.`,
    });
    const content = response.text ? response.text.trim() : "";
    const allowed = ["Programming", "AI / ML", "Gaming", "Social Media", "Finance", "Entertainment", "Sports", "Shopping", "Cooking", "Travel", "Photography", "Gardening", "General Search & News"];
    const found = allowed.find(cat => content.toLowerCase().includes(cat.toLowerCase()));
    return found || categorizeDomainOffline(domain);
  } catch (error) {
    console.error("Gemini domain categorization failed, using offline lookup", error);
    return categorizeDomainOffline(domain);
  }
}

// Compute all statistical engine outputs
async function computeTelemetry(
  history: Array<{
    category: string;
    domain?: string;
  }>,
  userId: string = DEFAULT_USER_ID
) {
  const categoriesCount: Record<string, number> = {};
  history.forEach(item => {
    categoriesCount[item.category] = (categoriesCount[item.category] || 0) + 1;
  });

  const totalHits = history.length || 1;

  const historyText = history
    .map((h: any) => h.domain || h.category)
    .join(" ");

  // Uniqueness: ratio of niche developer or AI visits to general visits
  const techCount = (categoriesCount["Programming"] || 0) + (categoriesCount["AI / ML"] || 0);
  const uniquenessRatio = Math.min(1, techCount / totalHits);
  const uniqueness = Math.round((0.25 + uniquenessRatio * 0.7) * 100);

  // Tracker Exposure: based on ads / tracking networks generally found on commercial vs dev sites
  const generalCommHits = (categoriesCount["Social Media"] || 0) + (categoriesCount["Shopping"] || 0) + (categoriesCount["Entertainment"] || 0);
  const exposureRatio = Math.min(1, (generalCommHits * 1.5 + techCount * 0.8) / totalHits);
  const trackerExposure = Math.min(99, Math.round((0.35 + exposureRatio * 0.6) * 100));

  const modelResult = await queryModelServer(historyText, 0, uniqueness, trackerExposure);

  const interests = modelResult.interests;
  const profiles = modelResult.profiles;
  const shapValues = modelResult.shapValues;

  const profileScores = Object.values(profiles).sort((a,b) => b-a);
  const maxProfileScore = profileScores[0] || 0.1;
  const runnerProfileScore = profileScores[1] || 0.05;
  const confidence = Math.round(((maxProfileScore + runnerProfileScore) / 2) * 100);

  const riskScore = Math.min(
    99,
    Math.max(
      10,
      Math.round(modelResult.risk)
    )
  );
  const level = riskScore > 75 ? "High" : riskScore > 40 ? "Medium" : "Low";

  return {
    userId,
    interests,
    profiles,
    shapValues,
    risk: {
      score: riskScore,
      level,
      confidence,
      uniqueness,
      trackerExposure
    }
  };
}

async function simulateWithoutDomain(
  history: any[],
  domain: string,
  userId: string = DEFAULT_USER_ID
) {
  const filtered = history.filter(h => h.domain !== domain);
  return await computeTelemetry(filtered, userId);
}

async function calculateDomainImpact(
  history: any[],
  userId: string = DEFAULT_USER_ID
) {
  const current = await computeTelemetry(history, userId);
  const currentRisk = current.risk.score;
  
  const domains = [
    ...new Set(
      history.map(h => h.domain).filter(Boolean)
    )
  ];

  const resultsPromises = domains.map(async (domain) => {
    const simulated = await simulateWithoutDomain(history, domain, userId);
    const simulatedRisk = simulated.risk.score;

    return {
      domain,
      currentRisk,
      simulatedRisk,
      riskReduction: currentRisk - simulatedRisk,
      currentDeveloper: current.profiles?.Developer || 0,
      simulatedDeveloper: simulated.profiles?.Developer || 0
    };
  });

  const results = await Promise.all(resultsPromises);

  return results.sort((a, b) => b.riskReduction - a.riskReduction);
}

// REST API Endpoints

// GET /api/users - Get list of active tracking users
app.get("/api/users", (req, res) => {
  const db = readDB();
  res.json({ users: db.users || [] });
});

// Reset user history to baseline seed data for a specific user ID
app.post("/api/reset", async (req, res) => {
  const userId = (req.body.userId as string) || DEFAULT_USER_ID;
  const db = readDB();
  
  // Clean out history for this specific user
  db.history = db.history.filter(item => item.userId !== userId);
  
  // Seed history
  const seeded = SEED_HISTORY.map(h => ({
    ...h,
    id: "h_" + Math.random().toString(36).substring(2, 9),
    userId,
    timestamp: new Date(Date.now() - (SEED_HISTORY.indexOf(h) * 3600000)).toISOString()
  }));
  
  db.history.push(...seeded);
  
  // Update predictions for this user
  const state = await computeTelemetry(seeded, userId);
  db.predictions[userId] = state;
  
  // Ensure user is in list
  if (!db.users.find(u => u.id === userId)) {
    db.users.push({
      id: userId,
      email: userId === DEFAULT_USER_ID ? DEFAULT_USER_EMAIL : `${userId}@privacylens.local`,
      createdAt: new Date().toISOString()
    });
  }
  
  writeDB(db);
  
  res.json({
    message: "History and predictions reset to baseline successfully",
    history: seeded,
    predictions: state
  });
});

// GET /api/history - Get browsing history list for specific user
app.get("/api/history", (req, res) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  const db = readDB();
  const userHistory = db.history.filter(item => item.userId === userId);
  res.json({ history: userHistory });
});

// POST /api/history - Upload browsing data for specific user
app.post("/api/history", async (req, res) => {
  const { domain, userId: reqUserId } = req.body;
  const userId = reqUserId || DEFAULT_USER_ID;
  
  if (!domain || typeof domain !== "string") {
    return res.status(400).json({ error: "domain is required of type string" });
  }

  // Pre-process domain host
  let host = domain.trim();
  host = host.replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];

  const db = readDB();

  // Find category - either compute offline or query Gemini
  const category = await predictCategory(host);

  const newItem = {
    id: "h_" + Math.random().toString(36).substring(2, 9),
    userId: userId,
    domain: host,
    category,
    timestamp: new Date().toISOString()
  };

  db.history.unshift(newItem); // put at top of list

  // Sync users list
  if (!db.users.find(u => u.id === userId)) {
    db.users.push({
      id: userId,
      email: userId === DEFAULT_USER_ID ? DEFAULT_USER_EMAIL : `${userId}@privacylens.local`,
      createdAt: new Date().toISOString()
    });
  }

  const userHistory = db.history.filter(item => item.userId === userId);
  const state = await computeTelemetry(userHistory, userId);
  db.predictions[userId] = state;
  writeDB(db);

  res.json({
    message: "Browsing item added successfully and telemetry updated",
    item: newItem,
    predictions: state
  });
});

// DELETE /api/history/:id - Delete a specific history entry to show dynamic live updates!
app.delete("/api/history/:id", async (req, res) => {
  const { id } = req.params;
  const db = readDB();
  
  const item = db.history.find(h => h.id === id);
  if (!item) {
    return res.status(404).json({ error: "History item not found" });
  }
  
  const userId = item.userId;
  db.history = db.history.filter(h => h.id !== id);
  
  const userHistory = db.history.filter(h => h.userId === userId);
  const state = await computeTelemetry(userHistory, userId);
  db.predictions[userId] = state;
  writeDB(db);

  res.json({
    message: "Browsing item removed successfully",
    predictions: state
  });
});

// POST /api/predict/interests - Predict interests
app.post("/api/predict/interests", async (req, res) => {
  const { history } = req.body;
  if (!Array.isArray(history)) {
    return res.status(400).json({ error: "history must be an array of domains or history items" });
  }

  const items = history.map((item) => {
    const domain = typeof item === "string" ? item : item.domain;
    const cat = typeof item === "object" && (item as any).category ? (item as any).category : categorizeDomainOffline(domain);
    return { category: cat, domain };
  });

  const runState = await computeTelemetry(items);
  res.json({ interests: runState.interests });
});

// POST /api/predict/profile - Simulate advertiser matching based on interests
app.post("/api/predict/profile", async (req, res) => {
  const { history } = req.body;
  if (!history) {
    return res.status(400).json({ error: "history required" });
  }

  const historyText = Array.isArray(history) ? history.join(" ") : history;
  const modelResult = await queryModelServer(historyText);

  res.json({
    profiles: modelResult.profiles
  });
});

// GET /api/risk - Get risk metrics for specific user
app.get("/api/risk", async (req, res) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  const db = readDB();
  let state = db.predictions[userId];
  if (!state) {
    const userHistory = db.history.filter(h => h.userId === userId);
    state = await computeTelemetry(userHistory, userId);
    db.predictions[userId] = state;
    writeDB(db);
  }
  res.json(state.risk);
});

// GET /api/recommendations - Get anti-profiling decoy browsing recommendations
app.get("/api/recommendations", async (req, res) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  const db = readDB();
  let state = db.predictions[userId];
  if (!state) {
    const userHistory = db.history.filter(h => h.userId === userId);
    state = await computeTelemetry(userHistory, userId);
    db.predictions[userId] = state;
    writeDB(db);
  }

  // Find top advertiser profiles that need dilution
  const profilesMap = state.profiles || {};
  const activeProfiles = Object.entries(profilesMap)
    .sort((a: any, b: any) => b[1] - a[1])
    .filter((p: any) => p[1] > 0.40)
    .map(p => p[0]);

  const topProfiles = activeProfiles.length > 0 ? activeProfiles : ["Developer", "TechBuyer"];

  // Query Gemini API recursively or fallback deterministically
  const recommendations = await aiGetDecoys(topProfiles);
  res.json({ recommendations });
});

app.post("/api/counterfactual", async (req, res) => {
  const { removeDomain, userId: reqUserId } = req.body;
  const userId = reqUserId || DEFAULT_USER_ID;
  const db = readDB();

  const userHistory = db.history.filter(h => h.userId === userId);
  const current = await computeTelemetry(userHistory, userId);
  const simulated = await simulateWithoutDomain(userHistory, removeDomain, userId);

  res.json({
    removeDomain,
    currentRisk: current.risk.score,
    simulatedRisk: simulated.risk.score,
    delta: current.risk.score - simulated.risk.score,
    currentProfiles: current.profiles,
    simulatedProfiles: simulated.profiles
  });
});

app.get("/api/domain-impact", async (req, res) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  const db = readDB();
  const userHistory = db.history.filter(h => h.userId === userId);
  const impacts = await calculateDomainImpact(userHistory, userId);
  res.json({ impacts });
});
 
async function aiGetDecoys(topProfiles: string[]) {
  const defaultDecoys = [
    {
      category: "Gardening",
      reason: "Diversifies advertiser assumptions away from technical interests.",
      suggestedDomains: [
        "gardeners.com",
        "almanac.com"
      ],
      suggestedQueries: [
        "best plants for balcony",
        "how to grow tomatoes"
      ]
    },
    {
      category: "Photography",
      reason: "Creates signals associated with creative and visual interests.",
      suggestedDomains: [
        "dpreview.com",
        "flickr.com"
      ],
      suggestedQueries: [
        "best beginner camera",
        "portrait photography tips"
      ]
    },
    {
      category: "Cooking",
      reason: "Adds lifestyle-oriented browsing behavior.",
      suggestedDomains: [
        "allrecipes.com",
        "foodnetwork.com"
      ],
      suggestedQueries: [
        "easy pasta recipe",
        "healthy meal prep"
      ]
    }
  ];

  return defaultDecoys;
}

// Global API Fallbacks / Catch-Alls
app.get("/api/telemetry", async (req, res) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  const db = readDB();
  
  let userHistory = db.history.filter(h => h.userId === userId);
  if (userHistory.length === 0) {
    // Seed automatically for this new user ID
    const seeded = SEED_HISTORY.map(h => ({
      ...h,
      id: "h_" + Math.random().toString(36).substring(2, 9),
      userId,
      timestamp: new Date(Date.now() - (SEED_HISTORY.indexOf(h) * 3600000)).toISOString()
    }));
    db.history.push(...seeded);
    
    if (!db.users.find(u => u.id === userId)) {
      db.users.push({
        id: userId,
        email: userId === DEFAULT_USER_ID ? DEFAULT_USER_EMAIL : `${userId}@privacylens.local`,
        createdAt: new Date().toISOString()
      });
    }
    
    const state = await computeTelemetry(seeded, userId);
    db.predictions[userId] = state;
    writeDB(db);
    res.json({
      userId,
      history: seeded,
      ...state
    });
    return;
  }
  
  let state = db.predictions[userId];
  if (!state) {
    state = await computeTelemetry(userHistory, userId);
    db.predictions[userId] = state;
    writeDB(db);
  }
  
  res.json({
    userId,
    history: userHistory,
    ...state
  });
});

// Configure Vite or Static Assets serving based on Environment
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Configuring Vite Development Server Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Configuring Production Static assets serving...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PrivacyLens backend container running fully on http://0.0.0.0:${PORT}`);
  });
}

// Boot up sequence
(async () => {
  startPythonModelServer();
  
  // Wait until Python model server is responsive
  console.log("Waiting for Python model server to load models and bind to port 5001...");
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch("http://127.0.0.1:5001/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ historyText: "", uniqueness: 0, exposure: 0 })
      });
      if (res.ok) {
        console.log("Python model server is ready and responding!");
        break;
      }
    } catch (e) {
      // ignore and wait
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Initialise DB predictions on launch
  try {
    const launchDB = readDB();
    if (!launchDB.users) {
      launchDB.users = [];
    }
    // Ensure default user is in list
    if (!launchDB.users.find(u => u.id === DEFAULT_USER_ID)) {
      launchDB.users.push({
        id: DEFAULT_USER_ID,
        email: DEFAULT_USER_EMAIL,
        createdAt: new Date().toISOString()
      });
    }
    
    // Regenerate predictions for users
    for (const user of launchDB.users) {
      const userHistory = launchDB.history.filter(h => h.userId === user.id);
      launchDB.predictions[user.id] = await computeTelemetry(userHistory, user.id);
    }
    writeDB(launchDB);
  } catch (e) {
    console.error("Initial DB boot prediction failed", e);
  }

  startServer();
})();
