import express from "express";
import crypto from "crypto";
import { getDealById, getDealsByUser, setUserWallet } from "../db/index.js";

export function createApiServer(port: number) {
  const app = express();

  // CORS
  const miniAppUrl = process.env.MINI_APP_URL || "http://localhost:5173";
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", miniAppUrl);
    res.header("Access-Control-Allow-Headers", "Content-Type, X-Init-Data");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json());

  // initData validation middleware
  const validateInitData: express.RequestHandler = (req, res, next) => {
    const initData = req.headers["x-init-data"] as string | undefined;

    // In development, skip validation if no init data
    if (!initData && process.env.NODE_ENV !== "production") {
      // Set a test user for development
      (req as any).telegramUserId = 12345;
      next();
      return;
    }

    if (!initData) {
      res.status(401).json({ error: "Missing initData" });
      return;
    }

    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      res.status(500).json({ error: "Server misconfigured" });
      return;
    }

    try {
      const parsed = new URLSearchParams(initData);
      const hash = parsed.get("hash");
      if (!hash) {
        res.status(401).json({ error: "Invalid initData" });
        return;
      }

      parsed.delete("hash");
      const dataCheckString = Array.from(parsed.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("\n");

      const secretKey = crypto
        .createHmac("sha256", "WebAppData")
        .update(botToken)
        .digest();

      const computedHash = crypto
        .createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");

      if (computedHash !== hash) {
        res.status(401).json({ error: "Invalid hash" });
        return;
      }

      // Extract user ID
      const userParam = parsed.get("user");
      if (userParam) {
        const user = JSON.parse(userParam);
        (req as any).telegramUserId = user.id;
      }

      next();
    } catch {
      res.status(401).json({ error: "Invalid initData format" });
    }
  };

  // Apply validation to all API routes
  app.use("/api", validateInitData);

  // GET /api/deals/:id
  app.get("/api/deals/:id", (req, res) => {
    const deal = getDealById(req.params.id);
    if (!deal) {
      res.status(404).json({ error: "Deal not found" });
      return;
    }
    res.json(deal);
  });

  // GET /api/deals
  app.get("/api/deals", (req, res) => {
    const userId = (req as any).telegramUserId as number;
    if (!userId) {
      res.status(401).json({ error: "User not identified" });
      return;
    }
    const deals = getDealsByUser(userId);
    res.json(deals);
  });

  // POST /api/wallet
  app.post("/api/wallet", (req, res) => {
    const userId = (req as any).telegramUserId as number;
    if (!userId) {
      res.status(401).json({ error: "User not identified" });
      return;
    }

    const { wallet_address } = req.body;
    if (!wallet_address || typeof wallet_address !== "string") {
      res.status(400).json({ error: "Invalid wallet_address" });
      return;
    }

    setUserWallet(userId, wallet_address);
    res.json({ ok: true });
  });

  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });

  return app;
}
