import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import { startPythonModelServer } from "./src/services/pythonManager";
import { initDB } from "./src/db/sqlite";
import apiRouter from "./src/routes/api";

const app = express();
const PORT = 3000;
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled API Error:", err);
  res.status(500).json({ error: "Internal Server Error" });
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
  
  // Initialize Database
  initDB();

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
  
  startServer();
})();
