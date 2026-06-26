export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface BrowsingHistoryItem {
  id: string;
  userId: string;
  domain: string;
  category: string;
  timestamp: string;
}

export interface PredictionState {
  userId: string;
  interests: Record<string, number>;
  profiles: Record<string, number>;
  shapValues: Record<string, Array<{ feature: string; impact: number }>>;
  risk: {
    score: number;
    level: "Low" | "Medium" | "High";
    confidence: number;
    uniqueness: number;
    trackerExposure: number;
  };
}

export interface DecoyRecommendation {
  category: string;
  reason: string;
  suggestedDomains: string[];
  suggestedQueries: string[];
}
