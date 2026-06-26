import { spawn, ChildProcess } from "child_process";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

let pythonServerProcess: ChildProcess | null = null;

// Initialize Gemini Client
export let ai: GoogleGenAI | null = null;
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

export function startPythonModelServer() {
  console.log("Starting Python model server (backend/model_server.py)...");
  
  // Try cross-platform python/python3 execution
  const pythonExec = process.platform === "win32" ? "python" : "python3";
  pythonServerProcess = spawn(pythonExec, ["backend/model_server.py"]);

  pythonServerProcess.stdout?.on("data", (data: Buffer) => {
    console.log(`[Python Model Server]: ${data.toString().trim()}`);
  });

  pythonServerProcess.stderr?.on("data", (data: Buffer) => {
    console.error(`[Python Model Server Error]: ${data.toString().trim()}`);
  });

  pythonServerProcess.on("close", (code: number | null) => {
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

export interface ModelServerResponse {
  interests: Record<string, number>;
  profiles: Record<string, number>;
  risk: number;
  shapValues: Record<string, any>;
  isFallback?: boolean;
}

export async function queryModelServer(
  historySequence: string[],
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
        historySequence,
        confidence,
        uniqueness,
        exposure,
      }),
    });
    if (!response.ok) {
      throw new Error(`Model server returned status ${response.status}`);
    }
    const data = await response.json() as ModelServerResponse;
    data.isFallback = false;
    return data;
  } catch (error) {
    console.error("Failed to query Python model server, using fallback");
    return {
      isFallback: true,
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
