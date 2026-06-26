import express from 'express';
import 'express-async-errors';
import { ai, queryModelServer } from '../services/pythonManager';
import {
  getUsers, addUser,
  getHistory, addHistoryItem, deleteHistoryItem, deleteHistoryForUser,
  getPredictionState, savePredictionState
} from '../db/sqlite';

const router = express.Router();
const DEFAULT_USER_ID = "user_devanshi1896";
const DEFAULT_USER_EMAIL = "devanshi1896@gmail.com";

const SEED_HISTORY = [
  { domain: "github.com", category: "Programming" },
  { domain: "leetcode.com", category: "Programming" },
  { domain: "stackoverflow.com", category: "Programming" },
  { domain: "python.org", category: "Programming" },
  { domain: "openai.com", category: "AI / ML" },
  { domain: "huggingface.co", category: "AI / ML" },
  { domain: "espn.com", category: "Sports" },
  { domain: "netflix.com", category: "Entertainment" },
  { domain: "amazon.com", category: "Shopping" }
];

// Offline category fallback
function categorizeDomainOffline(domain: string): string {
  const d = domain.toLowerCase().trim();
  if (d.includes("github") || d.includes("gitlab") || d.includes("leetcode") || d.includes("hackerrank") || d.includes("stackoverflow") || d.includes("python.org") || d.includes("npmjs.com") || d.includes("rust-lang") || d.includes("aws") || d.includes("google.cloud") || d.includes("vercel")) return "Programming";
  if (d.includes("openai") || d.includes("chatgpt") || d.includes("claude") || d.includes("huggingface") || d.includes("deepmind")) return "AI / ML";
  if (d.includes("steam") || d.includes("epicgames") || d.includes("twitch") || d.includes("discord")) return "Gaming";
  if (d.includes("youtube") || d.includes("netflix") || d.includes("spotify")) return "Entertainment";
  if (d.includes("espn") || d.includes("nba") || d.includes("nfl") || d.includes("yahoo.com/sports")) return "Sports";
  if (d.includes("twitter") || d.includes("x.com") || d.includes("instagram") || d.includes("tiktok") || d.includes("facebook")) return "Social Media";
  if (d.includes("amazon") || d.includes("ebay") || d.includes("target") || d.includes("walmart")) return "Shopping";
  if (d.includes("fidelity") || d.includes("robinhood") || d.includes("coinbase") || d.includes("chase")) return "Finance";
  if (d.includes("recipe") || d.includes("cooking") || d.includes("foodnetwork")) return "Cooking";
  if (d.includes("travel") || d.includes("expedia") || d.includes("airbnb")) return "Travel";
  if (d.includes("camera") || d.includes("photography") || d.includes("flickr")) return "Photography";
  if (d.includes("gardening") || d.includes("gardeners")) return "Gardening";
  return "General Search & News";
}

// Predict category
async function predictCategory(domain: string): Promise<string> {
  if (!ai) return categorizeDomainOffline(domain);
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

// Telemetry Logic
export async function computeTelemetry(
  history: Array<{ category: string; domain?: string }>,
  userId: string = DEFAULT_USER_ID
) {
  const categoriesCount: Record<string, number> = {};
  history.forEach(item => {
    categoriesCount[item.category] = (categoriesCount[item.category] || 0) + 1;
  });

  const totalHits = history.length || 1;
  const historyText = history.map((h: any) => h.domain || h.category).join(" ");

  const techCount = (categoriesCount["Programming"] || 0) + (categoriesCount["AI / ML"] || 0);
  const uniquenessRatio = Math.min(1, techCount / totalHits);
  const uniqueness = Math.round((0.25 + uniquenessRatio * 0.7) * 100);

  const generalCommHits = (categoriesCount["Social Media"] || 0) + (categoriesCount["Shopping"] || 0) + (categoriesCount["Entertainment"] || 0);
  const exposureRatio = Math.min(1, (generalCommHits * 1.5 + techCount * 0.8) / totalHits);
  const trackerExposure = Math.min(99, Math.round((0.35 + exposureRatio * 0.6) * 100));

  const modelResult = await queryModelServer(historyText, 0, uniqueness, trackerExposure);

  const interests = modelResult.interests;
  const profiles = modelResult.profiles;
  const shapValues = modelResult.shapValues;
  const isFallback = modelResult.isFallback || false;

  const profileScores = Object.values(profiles).sort((a: any, b: any) => b - a) as number[];
  const maxProfileScore = profileScores[0] || 0.1;
  const runnerProfileScore = profileScores[1] || 0.05;
  const confidence = Math.round(((maxProfileScore + runnerProfileScore) / 2) * 100);

  const riskScore = Math.min(99, Math.max(10, Math.round(modelResult.risk)));
  const level = riskScore > 75 ? "High" : riskScore > 40 ? "Medium" : "Low";

  return {
    userId,
    interests,
    profiles,
    shapValues,
    isFallback,
    risk: {
      score: riskScore,
      level,
      confidence,
      uniqueness,
      trackerExposure
    }
  };
}

async function simulateWithoutDomain(history: any[], domain: string, userId: string = DEFAULT_USER_ID) {
  const filtered = history.filter(h => h.domain !== domain);
  return await computeTelemetry(filtered, userId);
}

async function calculateDomainImpact(history: any[], userId: string = DEFAULT_USER_ID) {
  const current = await computeTelemetry(history, userId);
  const currentRisk = current.risk.score;
  const domains = [...new Set(history.map(h => h.domain).filter(Boolean))];

  const resultsPromises = domains.map(async (domain) => {
    const simulated = await simulateWithoutDomain(history, domain as string, userId);
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

async function aiGetDecoys(topProfiles: string[]) {
  return [
    { category: "Gardening", reason: "Diversifies advertiser assumptions away from technical interests.", suggestedDomains: ["gardeners.com", "almanac.com"], suggestedQueries: ["best plants for balcony", "how to grow tomatoes"] },
    { category: "Photography", reason: "Creates signals associated with creative and visual interests.", suggestedDomains: ["dpreview.com", "flickr.com"], suggestedQueries: ["best beginner camera", "portrait photography tips"] },
    { category: "Cooking", reason: "Adds lifestyle-oriented browsing behavior.", suggestedDomains: ["allrecipes.com", "foodnetwork.com"], suggestedQueries: ["easy pasta recipe", "healthy meal prep"] }
  ];
}

async function ensureTelemetry(userId: string) {
  let state = getPredictionState(userId);
  if (!state) {
    const userHistory = getHistory(userId);
    if (userHistory.length === 0) {
      addUser(userId, userId === DEFAULT_USER_ID ? DEFAULT_USER_EMAIL : `${userId}@privacylens.local`);
      const seeded = SEED_HISTORY.map((h, i) => ({
        ...h,
        id: "h_" + Math.random().toString(36).substring(2, 9),
        userId,
        timestamp: new Date(Date.now() - (i * 3600000)).toISOString()
      }));
      seeded.forEach(addHistoryItem);
      state = await computeTelemetry(seeded, userId);
    } else {
      state = await computeTelemetry(userHistory, userId);
    }
    savePredictionState(userId, state);
  }
  return state;
}

// REST Endpoints
router.get('/users', (req, res) => {
  res.json({ users: getUsers() });
});

router.post('/reset', async (req, res) => {
  const userId = (req.body.userId as string) || DEFAULT_USER_ID;
  addUser(userId, userId === DEFAULT_USER_ID ? DEFAULT_USER_EMAIL : `${userId}@privacylens.local`);
  deleteHistoryForUser(userId);

  const seeded = SEED_HISTORY.map((h, i) => ({
    ...h,
    id: "h_" + Math.random().toString(36).substring(2, 9),
    userId,
    timestamp: new Date(Date.now() - (i * 3600000)).toISOString()
  }));
  seeded.forEach(addHistoryItem);

  const state = await computeTelemetry(seeded, userId);
  savePredictionState(userId, state);

  res.json({ message: "History reset", history: seeded, predictions: state });
});

router.get('/history', (req, res) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  res.json({ history: getHistory(userId) });
});

router.post('/history', async (req, res) => {
  const { domain, userId: reqUserId } = req.body;
  const userId = reqUserId || DEFAULT_USER_ID;
  if (!domain || typeof domain !== "string") return res.status(400).json({ error: "domain is required" });

  let host = domain.trim().replace(/^(https?:\/\/)?(www\.)?/, "").split("/")[0];
  const category = await predictCategory(host);

  addUser(userId, userId === DEFAULT_USER_ID ? DEFAULT_USER_EMAIL : `${userId}@privacylens.local`);
  
  const newItem = {
    id: "h_" + Math.random().toString(36).substring(2, 9),
    userId, domain: host, category,
    timestamp: new Date().toISOString()
  };
  addHistoryItem(newItem);

  const userHistory = getHistory(userId);
  const state = await computeTelemetry(userHistory, userId);
  savePredictionState(userId, state);

  res.json({ item: newItem, predictions: state });
});

router.delete('/history/:id', async (req, res) => {
  const { id } = req.params;
  const dbItem = getHistory("").find((h: any) => h.id === id); // SQLite doesn't have getHistoryById yet, just fetch all or filter
  // wait, I don't need to fetch to delete, but I need userId to update prediction
  // I will just refetch telemetry from query params or assume body userId
  const userId = (req.query.userId as string) || (req.body.userId as string) || DEFAULT_USER_ID;
  
  deleteHistoryItem(id);
  const userHistory = getHistory(userId);
  const state = await computeTelemetry(userHistory, userId);
  savePredictionState(userId, state);

  res.json({ predictions: state });
});

router.post('/predict/interests', async (req, res) => {
  const { history } = req.body;
  const items = history.map((item: any) => ({
    category: (item.category) || categorizeDomainOffline(item.domain || item),
    domain: item.domain || item
  }));
  const state = await computeTelemetry(items);
  res.json({ interests: state.interests });
});

router.post('/predict/profile', async (req, res) => {
  const { history } = req.body;
  const historyText = Array.isArray(history) ? history.join(" ") : history;
  const modelResult = await queryModelServer(historyText);
  res.json({ profiles: modelResult.profiles });
});

router.get('/risk', async (req, res) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  const state = await ensureTelemetry(userId);
  res.json(state.risk);
});

router.get('/recommendations', async (req, res) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  const state = await ensureTelemetry(userId);
  const activeProfiles = Object.entries(state.profiles || {}).sort((a: any, b: any) => b[1] - a[1]).filter((p: any) => p[1] > 0.40).map(p => p[0]);
  const topProfiles = activeProfiles.length > 0 ? activeProfiles : ["Developer", "TechBuyer"];
  res.json({ recommendations: await aiGetDecoys(topProfiles) });
});

router.post('/counterfactual', async (req, res) => {
  const { removeDomain, userId: reqUserId } = req.body;
  const userId = reqUserId || DEFAULT_USER_ID;
  const userHistory = getHistory(userId);
  const current = await computeTelemetry(userHistory, userId);
  const simulated = await simulateWithoutDomain(userHistory, removeDomain, userId);
  res.json({ removeDomain, currentRisk: current.risk.score, simulatedRisk: simulated.risk.score, delta: current.risk.score - simulated.risk.score, currentProfiles: current.profiles, simulatedProfiles: simulated.profiles });
});

router.get('/domain-impact', async (req, res) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  const userHistory = getHistory(userId);
  const impacts = await calculateDomainImpact(userHistory, userId);
  res.json({ impacts });
});

router.get('/telemetry', async (req, res) => {
  const userId = (req.query.userId as string) || DEFAULT_USER_ID;
  const state = await ensureTelemetry(userId);
  const history = getHistory(userId);
  res.json({ userId, history, ...state });
});

export default router;
