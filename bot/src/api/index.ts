import express from "express";
import crypto from "crypto";
import type { Bot, Context } from "grammy";
import { verifyTelegramLoginWidget, type TelegramLoginData } from "./auth.js";
import {
  getDealById, getDealsByUser, getActiveDeals, setUserWallet, getUserWallet, getOfferById, getOffersByUser,
  getOpenOffers, createOffer, addApplication, getApplicationById, getApplicationsByOffer,
  countApplicationsByOffer, acceptApplication, rejectAllApplications, closeOffer,
  getReputation, getDetailedReputation, getLeaderboard, getGroupStatsById,
  upsertGithubProfile, getGithubProfile, deleteGithubProfile, isGithubStale,
  getGithubAccessToken, countGithubVerified, aggregateLanguages,
  getPlatformStats, getRecentDeals,
  getParsedJobs, getParsedJobById,
  getSetting, setSetting, getAllSettings,
  banUser, unbanUser, isUserBanned, searchUsers,
  getDisputeDeals, resolveDeal,
  getAdminDashboardStats,
  getAllSources, createSource, updateSource, getSourceById,
  updateJobStatus,
  getJobsByPoster, createJobResponse, getJobResponses, hasUserResponded, countResponsesByJob,
  createDeal,
  createSpec, getSpecById,
  updateJobPriceEstimate,
} from "../db/index.js";
import { calcTrustScore, calcTrustScoreBreakdown, assessDealRisk, extractSkills, calcSkillMatch, generateProposal, generateSpec as generateSpecAI, estimatePrice } from "../ai/index.js";
import { exchangeCode, fetchGithubProfile } from "../github/index.js";
import { calcGithubScore, detectFlags } from "../github/score.js";

function maskField(value: string | null): string | null {
  if (value === null) return null;
  if (value.length < 4) return "\u2588\u2588\u2588\u2588";
  return value.slice(0, 4) + "\u2588\u2588\u2588\u2588";
}

export function createApiServer(port: number, bot?: Bot<Context>) {
  const app = express();

  // CORS
  const miniAppUrl = process.env.MINI_APP_URL || "http://localhost:5173";
  if (!process.env.MINI_APP_URL && process.env.NODE_ENV === "production") {
    console.warn("WARNING: MINI_APP_URL is not set. CORS will default to localhost.");
  }
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", miniAppUrl);
    res.header("Access-Control-Allow-Headers", "Content-Type, X-Init-Data, X-Telegram-Auth");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json());

  // Dual auth middleware: supports both Mini App initData and Telegram Login Widget
  const validateInitData: express.RequestHandler = (req, res, next) => {
    const initData = req.headers["x-init-data"] as string | undefined;
    const telegramAuth = req.headers["x-telegram-auth"] as string | undefined;

    // Skip validation only when explicitly opted in
    if (!initData && !telegramAuth && process.env.DEV_SKIP_AUTH === "true") {
      (req as any).telegramUserId = 12345;
      next();
      return;
    }

    const botToken = process.env.BOT_TOKEN;
    if (!botToken) {
      res.status(500).json({ error: "Server misconfigured" });
      return;
    }

    // Method 1: Mini App initData (X-Init-Data header)
    if (initData) {
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

        const userParam = parsed.get("user");
        if (userParam) {
          const user = JSON.parse(userParam);
          (req as any).telegramUserId = user.id;
        }

        next();
        return;
      } catch {
        res.status(401).json({ error: "Invalid initData format" });
        return;
      }
    }

    // Method 2: Telegram Login Widget (X-Telegram-Auth header)
    if (telegramAuth) {
      try {
        const data: TelegramLoginData = JSON.parse(telegramAuth);
        const verified = verifyTelegramLoginWidget(data, botToken);
        if (!verified) {
          const now = Math.floor(Date.now() / 1000);
          console.error(`[auth] Telegram Login failed for user ${data.id}: auth_date=${data.auth_date}, age=${now - data.auth_date}s, hash=${data.hash?.slice(0, 8)}...`);
          res.status(401).json({ error: "Invalid Telegram auth" });
          return;
        }
        (req as any).telegramUserId = data.id;
        next();
        return;
      } catch {
        res.status(401).json({ error: "Invalid Telegram auth format" });
        return;
      }
    }

    res.status(401).json({ error: "Authentication required" });
  };

  // Admin auth middleware: checks if user is in ADMIN_TELEGRAM_IDS
  const adminIds = new Set(
    (process.env.ADMIN_TELEGRAM_IDS || "").split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n))
  );

  const adminOnly: express.RequestHandler = (req, res, next) => {
    const userId = (req as any).telegramUserId as number | undefined;
    if (!userId || !adminIds.has(userId)) {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  };

  // Ban check middleware: returns 403 for banned users
  const checkBan: express.RequestHandler = async (req, res, next) => {
    const userId = (req as any).telegramUserId as number | undefined;
    if (userId && await isUserBanned(userId)) {
      res.status(403).json({ error: "Account suspended" });
      return;
    }
    next();
  };

  // Apply validation to all API routes (except public endpoints)
  app.get("/api/stats", async (_req, res) => {
    const cached = apiCache.get("stats");
    if (cached && Date.now() - cached.ts < 60_000) { res.json(cached.data); return; }
    const stats = await getPlatformStats();
    apiCache.set("stats", { data: stats, ts: Date.now() });
    res.json(stats);
  });

  // --- Public endpoints (no auth required) ---

  // GET /api/offers/public — open offers with creator info
  app.get("/api/offers/public", async (_req, res) => {
    const offers = await getOpenOffers();
    const result = await Promise.all(
      offers.map(async (o) => {
        const rep = await getDetailedReputation(o.creator_id);
        return {
          ...o,
          application_count: await countApplicationsByOffer(o.id),
          creator_trust_score: calcTrustScore(rep),
        };
      }),
    );
    // Sort by created_at desc
    result.sort((a, b) => (b.created_at > a.created_at ? 1 : -1));
    res.json(result);
  });

  // GET /api/offers/public/:id — single offer with creator profile
  app.get("/api/offers/public/:id", async (req, res) => {
    const offer = await getOfferById(req.params.id);
    if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
    const rep = await getDetailedReputation(offer.creator_id);
    const apps = await getApplicationsByOffer(offer.id);
    res.json({
      ...offer,
      application_count: apps.length,
      creator_reputation: rep,
      creator_trust_score: calcTrustScore(rep),
    });
  });

  // --- Jobs API ---

  // In-memory cache for jobs list (60s TTL)
  const jobsCache = new Map<string, { data: unknown; ts: number }>();

  // Rate-limit tracker for proposal generation: userId -> [timestamps]
  const proposalRateLimit = new Map<number, number[]>();

  // GET /api/jobs — paginated list of parsed jobs (public, no auth)
  app.get("/api/jobs", async (req, res) => {
    try {
      const skills = req.query.skills
        ? (req.query.skills as string).split(",").map(s => s.trim()).filter(Boolean)
        : undefined;
      const min_budget = req.query.min_budget ? Number(req.query.min_budget) : undefined;
      const max_budget = req.query.max_budget ? Number(req.query.max_budget) : undefined;
      const currency = (req.query.currency as string) || undefined;
      const sort = (req.query.sort as "newest" | "price_asc" | "price_desc") || "newest";
      const has_budget = req.query.has_budget === "true";
      const statusParam = (req.query.status as string) || "new,verified";
      const status = statusParam.split(",").map(s => s.trim()).filter(Boolean);
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));

      // Build cache key from query params
      const cacheKey = `jobs:${JSON.stringify({ skills, min_budget, max_budget, currency, sort, has_budget, status, page, limit })}`;
      const cachedEntry = jobsCache.get(cacheKey);
      if (cachedEntry && Date.now() - cachedEntry.ts < 60_000) {
        res.json(cachedEntry.data);
        return;
      }

      const result = await getParsedJobs({ skills, min_budget, max_budget, currency, sort, has_budget, status, page, limit });
      const responseData = { data: result.data, total: result.total, page, limit };
      jobsCache.set(cacheKey, { data: responseData, ts: Date.now() });
      res.json(responseData);
    } catch (e: any) {
      console.error("GET /api/jobs error:", e.message);
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  // GET /api/jobs/:id — single job detail (public, optional auth for skill_match)
  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await getParsedJobById(req.params.id);
      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      const responseData: Record<string, unknown> = { ...job };

      // Optional auth: try to extract user for skill matching
      const initData = req.headers["x-init-data"] as string | undefined;
      const telegramAuth = req.headers["x-telegram-auth"] as string | undefined;
      let userId: number | undefined;

      if (initData) {
        try {
          const parsed = new URLSearchParams(initData);
          const hash = parsed.get("hash");
          const botToken = process.env.BOT_TOKEN;
          if (hash && botToken) {
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
            if (computedHash === hash) {
              const userParam = parsed.get("user");
              if (userParam) {
                userId = JSON.parse(userParam).id;
              }
            }
          }
        } catch { /* ignore auth errors on optional auth */ }
      } else if (telegramAuth) {
        try {
          const botToken = process.env.BOT_TOKEN;
          if (botToken) {
            const data = JSON.parse(telegramAuth);
            if (verifyTelegramLoginWidget(data, botToken)) {
              userId = data.id;
            }
          }
        } catch { /* ignore auth errors on optional auth */ }
      } else if (process.env.DEV_SKIP_AUTH === "true") {
        userId = 12345;
      }

      // If authenticated and job has required_skills, compute skill_match
      if (userId && job.required_skills && job.required_skills.length > 0) {
        const ghProfile = await getGithubProfile(userId);
        if (ghProfile?.languages) {
          responseData.skill_match = calcSkillMatch(ghProfile.languages, job.required_skills);
        }
      }

      // Look up source info
      const source = await getSourceById(job.source_id);
      if (source) {
        responseData.source_title = userId ? source.title : maskField(source.title);
        responseData.source_username = userId ? source.username : maskField(source.username);
      }

      // Auth-aware field masking for contact/poster fields
      if (!userId) {
        responseData.contact_username = maskField(job.contact_username);
        responseData.poster_username = maskField(job.poster_username);
        responseData.contact_url = maskField(job.contact_url);
      }

      // AI price estimate (Task 1.4)
      if (job.ai_price_estimate) {
        responseData.price_estimate = job.ai_price_estimate;
      } else {
        try {
          const estimate = await estimatePrice({
            title: job.title,
            category: (job.required_skills && job.required_skills.length > 0) ? job.required_skills[0] : "General",
            requirements: [job.description],
            budget_currency: job.currency,
          });
          await updateJobPriceEstimate(job.id, estimate);
          responseData.price_estimate = estimate;
        } catch (err: any) {
          console.error("estimatePrice error for job", job.id, err.message);
          // Don't break the response — just omit price_estimate
        }
      }

      res.json(responseData);
    } catch (e: any) {
      console.error("GET /api/jobs/:id error:", e.message);
      res.status(500).json({ error: "Failed to fetch job" });
    }
  });

  // POST /api/jobs/:id/proposal — generate AI proposal (authenticated)
  app.post("/api/jobs/:id/proposal", validateInitData, async (req, res) => {
    try {
      const userId = (req as any).telegramUserId as number;
      if (!userId) {
        res.status(401).json({ error: "User not identified" });
        return;
      }

      // Rate limit: max 10 proposals per user per day
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const userTimestamps = proposalRateLimit.get(userId) || [];
      const recentTimestamps = userTimestamps.filter(ts => now - ts < dayMs);
      if (recentTimestamps.length >= 10) {
        res.status(429).json({ error: "Rate limit exceeded. Max 10 proposals per day." });
        return;
      }

      // Check GitHub profile
      const ghProfile = await getGithubProfile(userId);
      if (!ghProfile) {
        res.status(400).json({ error: "GitHub profile not linked. Connect your GitHub account first." });
        return;
      }

      // Get the job
      const job = await getParsedJobById(req.params.id as string);
      if (!job) {
        res.status(404).json({ error: "Job not found" });
        return;
      }

      // Generate proposal
      const proposalText = await generateProposal(
        job.description,
        job.required_skills || [],
        {
          username: ghProfile.username,
          languages: ghProfile.languages || {},
          top_repos: (ghProfile.top_repos || []).map(r => ({
            name: r.name,
            stars: r.stars,
            language: r.language,
          })),
          total_commits_year: ghProfile.total_commits_year,
          github_score: ghProfile.github_score,
        },
      );

      // Track rate limit
      recentTimestamps.push(now);
      proposalRateLimit.set(userId, recentTimestamps);

      res.json({ proposal_text: proposalText });
    } catch (e: any) {
      console.error("POST /api/jobs/:id/proposal error:", e.message);
      res.status(500).json({ error: "Failed to generate proposal" });
    }
  });

  // --- GitHub OAuth (no auth required) ---

  app.get("/api/github/auth", (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL;
    if (!clientId || !callbackUrl) {
      res.status(500).json({ error: "GitHub OAuth not configured" });
      return;
    }
    const state = (req.query.userId || req.query.user_id) as string || "";
    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}&scope=read:user,read:org&state=${state}`;
    res.redirect(url);
  });

  app.get("/api/github/callback", async (req, res) => {
    const code = req.query.code as string;
    const userId = parseInt(req.query.state as string);
    if (!code || !userId) {
      res.status(400).json({ error: "Missing code or state" });
      return;
    }
    try {
      const accessToken = await exchangeCode(code);
      const profile = await fetchGithubProfile(accessToken);
      const flags = detectFlags(profile);
      const score = calcGithubScore(profile);

      await upsertGithubProfile({
        user_id: userId,
        github_id: profile.github_id,
        username: profile.username,
        avatar_url: profile.avatar_url,
        profile_url: profile.profile_url,
        bio: profile.bio ?? undefined,
        public_repos: profile.public_repos,
        followers: profile.followers,
        following: profile.following,
        account_created_at: profile.account_created_at,
        languages: profile.languages,
        top_repos: profile.top_repos,
        total_stars: profile.total_stars,
        total_forks: profile.total_forks,
        total_commits_year: profile.total_commits_year,
        orgs_count: profile.orgs_count,
        github_score: score,
        flags,
        access_token: accessToken,
      });

      // Redirect back to Mini App profile
      const miniAppUrl = process.env.MINI_APP_URL || "http://localhost:5173";
      res.redirect(`${miniAppUrl}/profile?github=linked`);
    } catch (e: any) {
      console.error("GitHub OAuth error:", e.message);
      const miniAppUrl = process.env.MINI_APP_URL || "http://localhost:5173";
      res.redirect(`${miniAppUrl}/profile?github=error`);
    }
  });

  // --- Talent & Activity API (no auth) ---

  // In-memory cache (60s)
  const apiCache = new Map<string, { data: unknown; ts: number }>();
  function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const entry = apiCache.get(key);
    if (entry && Date.now() - entry.ts < ttl) return Promise.resolve(entry.data as T);
    return fn().then((data) => { apiCache.set(key, { data, ts: Date.now() }); return data; });
  }

  app.get("/api/talent", async (_req, res) => {
    const data = await cached("talent", 60000, async () => {
      const langs = await aggregateLanguages();
      const ghCount = await countGithubVerified();
      return {
        languages: langs.slice(0, 20),
        total_devs: ghCount,
        categories: [
          { name: "Development", status: "active", count: ghCount },
          { name: "Design", status: "coming_soon" },
          { name: "Marketing", status: "coming_soon" },
          { name: "Content", status: "coming_soon" },
        ],
      };
    });
    res.json(data);
  });

  app.get("/api/activity", async (_req, res) => {
    const data = await cached("activity", 60000, async () => {
      const allDeals = await getActiveDeals();
      // Get last 10 deals, sanitize
      const recent = allDeals.slice(0, 10).map((d) => ({
        type: d.status === "completed" ? "completed" : d.status === "funded" || d.status === "delivered" ? "in_progress" : "new",
        description: d.description.slice(0, 60),
        amount: d.amount,
        currency: d.currency,
      }));
      return { activity: recent };
    });
    res.json(data);
  });

  // --- Groups API (public, before auth middleware) ---

  // GET /api/groups/top — top groups for leaderboard (must be before /:id)
  app.get("/api/groups/top", async (req, res) => {
    try {
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));
      const groups = await getLeaderboard("completed_deals", limit);
      res.json(groups);
    } catch (e: any) {
      console.error("GET /api/groups/top error:", e.message);
      res.status(500).json({ error: "Failed to fetch top groups" });
    }
  });

  // GET /api/groups — leaderboard
  app.get("/api/groups", async (req, res) => {
    try {
      const sortBy = (req.query.sort as string) || "completed_deals";
      const limit = parseInt(req.query.limit as string) || 10;
      const validSorts = ["completed_deals", "total_volume", "avg_check"] as const;
      const sort = validSorts.includes(sortBy as any) ? sortBy as typeof validSorts[number] : "completed_deals";
      const groups = await getLeaderboard(sort, Math.min(limit, 50));
      res.json(groups);
    } catch {
      res.json([]);
    }
  });

  // GET /api/groups/:id — group dashboard data
  app.get("/api/groups/:id", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      if (isNaN(groupId)) { res.status(400).json({ error: "Invalid group ID" }); return; }
      const stats = await getGroupStatsById(groupId);
      if (!stats) { res.status(404).json({ error: "Group not found" }); return; }
      res.json(stats);
    } catch {
      res.status(500).json({ error: "Failed to fetch group" });
    }
  });

  // --- Auth middleware for protected routes ---
  app.use("/api", validateInitData);
  app.use("/api", checkBan);

  // GET /api/deals/:id
  app.get("/api/deals/:id", async (req, res) => {
    const userId = (req as any).telegramUserId as number;
    const deal = await getDealById(req.params.id);
    if (!deal) {
      res.status(404).json({ error: "Deal not found" });
      return;
    }
    if (userId && deal.seller_id !== userId && deal.buyer_id !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }
    res.json(deal);
  });

  // GET /api/deals
  app.get("/api/deals", async (req, res) => {
    const userId = (req as any).telegramUserId as number;
    if (!userId) {
      res.status(401).json({ error: "User not identified" });
      return;
    }
    const deals = await getDealsByUser(userId);
    res.json(deals);
  });

  // POST /api/wallet
  app.post("/api/wallet", async (req, res) => {
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

    await setUserWallet(userId, wallet_address);
    res.json({ ok: true });
  });

  // --- Offers API ---

  // GET /api/offers — user's offers with application counts
  app.get("/api/offers", async (req, res) => {
    const userId = (req as any).telegramUserId as number;
    if (!userId) { res.status(401).json({ error: "User not identified" }); return; }
    const offers = await getOffersByUser(userId);
    const result = await Promise.all(offers.map(async o => ({
      ...o,
      application_count: await countApplicationsByOffer(o.id),
    })));
    res.json(result);
  });

  // GET /api/offers/:id — offer with applications, reputations, and skill match
  app.get("/api/offers/:id", async (req, res) => {
    const offer = await getOfferById(req.params.id);
    if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }

    // Extract required skills from offer description (cached per request)
    let requiredSkills: string[] = [];
    try { requiredSkills = await extractSkills(offer.description); } catch { /* non-critical */ }

    const apps = await getApplicationsByOffer(offer.id);
    const appsWithRep = await Promise.all(apps.map(async a => {
      const rep = await getDetailedReputation(a.user_id);
      const ghProfile = await getGithubProfile(a.user_id);
      const trustScore = calcTrustScore(rep, {
        githubScore: ghProfile?.github_score ?? undefined,
        hasGithub: !!ghProfile,
      });
      const skillMatch = ghProfile?.languages && requiredSkills.length > 0
        ? calcSkillMatch(ghProfile.languages, requiredSkills)
        : undefined;
      return {
        ...a,
        reputation: rep,
        trust_score: trustScore,
        github_verified: !!ghProfile,
        skill_match: skillMatch,
      };
    }));
    res.json({ ...offer, applications: appsWithRep, required_skills: requiredSkills });
  });

  // POST /api/offers — create offer from Mini App
  app.post("/api/offers", async (req, res) => {
    const userId = (req as any).telegramUserId as number;
    if (!userId) { res.status(401).json({ error: "User not identified" }); return; }
    const { description, min_price, currency, role } = req.body;
    if (!description) { res.status(400).json({ error: "Description required" }); return; }

    const offerId = `off_${Date.now()}_${userId}`;
    const offer = await createOffer({
      id: offerId,
      creator_id: userId,
      description,
      min_price: min_price ?? undefined,
      currency: currency ?? "TON",
      role: role ?? "buyer",
    });
    res.json(offer);
  });

  // POST /api/offers/:id/apply — submit application
  app.post("/api/offers/:id/apply", async (req, res) => {
    const userId = (req as any).telegramUserId as number;
    if (!userId) { res.status(401).json({ error: "User not identified" }); return; }
    const offer = await getOfferById(req.params.id);
    if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
    if (offer.status !== "open") { res.status(400).json({ error: "Offer is closed" }); return; }
    if (offer.creator_id === userId) { res.status(400).json({ error: "Cannot apply to own offer" }); return; }

    const { price, message } = req.body;
    if (!price || typeof price !== "number") { res.status(400).json({ error: "Price required" }); return; }

    const appId = `app_${Date.now()}_${userId}`;
    const application = await addApplication({
      id: appId, offer_id: offer.id, user_id: userId, price, message: message ?? undefined,
    });
    res.json(application);
  });

  // POST /api/offers/:id/select/:applicationId — select applicant
  app.post("/api/offers/:id/select/:applicationId", async (req, res) => {
    const userId = (req as any).telegramUserId as number;
    if (!userId) { res.status(401).json({ error: "User not identified" }); return; }
    const offer = await getOfferById(req.params.id);
    if (!offer) { res.status(404).json({ error: "Offer not found" }); return; }
    if (offer.creator_id !== userId) { res.status(403).json({ error: "Not authorized" }); return; }

    const application = await getApplicationById(req.params.applicationId);
    if (!application) { res.status(404).json({ error: "Application not found" }); return; }

    // TODO: create deal from offer+application (reuse bot logic)
    await acceptApplication(application.id);
    await rejectAllApplications(offer.id, application.id);
    await closeOffer(offer.id, `deal_from_api_${Date.now()}`);

    res.json({ ok: true, message: "Applicant selected" });
  });

  // --- Profile API ---

  // GET /api/profile — own profile (with GitHub + Trust Score breakdown)
  app.get("/api/profile", async (req, res) => {
    const userId = (req as any).telegramUserId as number;
    if (!userId) { res.status(401).json({ error: "User not identified" }); return; }
    const rep = await getDetailedReputation(userId);
    const userDeals = await getDealsByUser(userId);
    const github = await getGithubProfile(userId);
    const wallet = await getUserWallet(userId);

    const trustOpts = { githubScore: github?.github_score, hasGithub: !!github, hasWallet: !!wallet };
    const trustBreakdown = calcTrustScoreBreakdown(rep, trustOpts);

    // Lazy refresh if stale
    if (github && await isGithubStale(userId)) {
      const token = await getGithubAccessToken(userId);
      if (token) {
        fetchGithubProfile(token).then(async (fresh) => {
          const flags = detectFlags(fresh);
          const score = calcGithubScore(fresh);
          await upsertGithubProfile({
            user_id: userId, github_id: fresh.github_id, username: fresh.username,
            avatar_url: fresh.avatar_url, profile_url: fresh.profile_url,
            bio: fresh.bio ?? undefined, public_repos: fresh.public_repos,
            followers: fresh.followers, following: fresh.following,
            account_created_at: fresh.account_created_at, languages: fresh.languages,
            top_repos: fresh.top_repos, total_stars: fresh.total_stars,
            total_forks: fresh.total_forks, total_commits_year: fresh.total_commits_year,
            orgs_count: fresh.orgs_count, github_score: score, flags,
          });
        }).catch((e) => console.error("GitHub refresh error:", e.message));
      }
    }

    res.json({
      user_id: userId, reputation: rep, trust_score: trustBreakdown.total,
      trust_breakdown: trustBreakdown, deal_count: userDeals.length, github,
      telegram_verified: true, wallet_connected: !!wallet,
    });
  });

  // GET /api/profile/:userId — public profile (contact privacy: show telegram_username only if active funded deal)
  app.get("/api/profile/:userId", async (req, res) => {
    const targetId = parseInt(req.params.userId);
    if (isNaN(targetId)) { res.status(400).json({ error: "Invalid user ID" }); return; }
    const requesterId = (req as any).telegramUserId as number | undefined;
    const rep = await getDetailedReputation(targetId);
    const github = await getGithubProfile(targetId);
    const wallet = await getUserWallet(targetId);
    const trustOpts = { githubScore: github?.github_score, hasGithub: !!github, hasWallet: !!wallet };
    const trustBreakdown = calcTrustScoreBreakdown(rep, trustOpts);

    // Contact privacy: only show telegram_username if active funded deal exists
    let showContact = false;
    if (requesterId) {
      const requesterDeals = await getDealsByUser(requesterId);
      showContact = requesterDeals.some(d =>
        (d.seller_id === targetId || d.buyer_id === targetId) &&
        ["funded", "delivered", "dispute"].includes(d.status)
      );
    }

    res.json({
      user_id: targetId, reputation: rep, trust_score: trustBreakdown.total,
      trust_breakdown: trustBreakdown, github,
      telegram_verified: true, wallet_connected: !!wallet,
      telegram_username: showContact ? undefined : undefined, // username resolved by caller if showContact
      show_contact: showContact,
    });
  });

  // POST /api/github/unlink — remove GitHub profile
  app.post("/api/github/unlink", async (req, res) => {
    const userId = (req as any).telegramUserId as number;
    if (!userId) { res.status(401).json({ error: "User not identified" }); return; }
    await deleteGithubProfile(userId);
    res.json({ ok: true });
  });

  // --- Risk API ---

  // GET /api/risk/deal/:dealId — deal risk assessment
  app.get("/api/risk/deal/:dealId", async (req, res) => {
    const deal = await getDealById(req.params.dealId);
    if (!deal) { res.status(404).json({ error: "Deal not found" }); return; }
    try {
      const risk = await assessDealRisk(deal.id);
      res.json(risk);
    } catch {
      res.status(500).json({ error: "Risk assessment failed" });
    }
  });

  // Groups API moved above auth middleware (public)

  // ========== Job Responses API ==========

  // Response notification throttle: jobId -> { count, date }
  const responseNotifyThrottle = new Map<string, { count: number; date: string }>();

  // POST /api/jobs/:id/respond — executor responds to a job
  app.post("/api/jobs/:id/respond", async (req, res) => {
    try {
      const userId = (req as any).telegramUserId as number;
      if (!userId) { res.status(401).json({ error: "User not identified" }); return; }

      // Require GitHub profile
      const ghProfile = await getGithubProfile(userId);
      if (!ghProfile) {
        res.status(400).json({ error: "GitHub profile not linked" });
        return;
      }

      const jobId = req.params.id as string;
      const job = await getParsedJobById(jobId);
      if (!job) { res.status(404).json({ error: "Job not found" }); return; }
      if (job.status === "expired" || job.status === "spam") {
        res.status(400).json({ error: "Job is no longer active" });
        return;
      }

      // Check duplicate
      if (await hasUserResponded(jobId, userId)) {
        res.status(409).json({ error: "Already responded to this job" });
        return;
      }

      const { proposal_text } = req.body;
      if (!proposal_text || typeof proposal_text !== "string") {
        res.status(400).json({ error: "proposal_text required" });
        return;
      }

      const responseId = `resp_${Date.now()}_${userId}`;
      const response = await createJobResponse({
        id: responseId,
        parsed_job_id: jobId,
        user_id: userId,
        proposal_text,
      });

      // DM poster about new response (throttled: max 3 per job per day)
      if (job.poster_telegram_id && bot) {
        const today = new Date().toISOString().slice(0, 10);
        const throttleKey = `${jobId}:${today}`;
        const entry = responseNotifyThrottle.get(throttleKey) ?? { count: 0, date: today };

        if (entry.count < 3) {
          try {
            const rep = await getDetailedReputation(userId);
            const trust = calcTrustScore(rep);
            await bot.api.sendMessage(job.poster_telegram_id,
              `На ваш заказ «${job.title}» откликнулся исполнитель` +
              (trust !== null ? ` с Trust Score ${trust}` : "") +
              `.\n\nОткройте профиль чтобы увидеть отклик.`,
            );
          } catch { /* poster blocked bot */ }
          entry.count++;
        } else if (entry.count === 3) {
          // One aggregate notification
          try {
            const totalResponses = await countResponsesByJob(jobId);
            await bot.api.sendMessage(job.poster_telegram_id,
              `На ваш заказ «${job.title}» откликнулись ещё исполнители (всего ${totalResponses}).`,
            );
          } catch { /* poster blocked bot */ }
          entry.count++;
        }
        responseNotifyThrottle.set(throttleKey, entry);
      }

      res.json(response);
    } catch (e: any) {
      console.error("POST /api/jobs/:id/respond error:", e.message);
      res.status(500).json({ error: "Failed to respond to job" });
    }
  });

  // GET /api/my-jobs — poster's parsed jobs
  app.get("/api/my-jobs", async (req, res) => {
    try {
      const userId = (req as any).telegramUserId as number;
      if (!userId) { res.status(401).json({ error: "User not identified" }); return; }
      const jobs = await getJobsByPoster(userId);
      res.json(jobs);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch my jobs" });
    }
  });

  // GET /api/my-jobs/:id/responses — responses for a poster's job
  app.get("/api/my-jobs/:id/responses", async (req, res) => {
    try {
      const userId = (req as any).telegramUserId as number;
      if (!userId) { res.status(401).json({ error: "User not identified" }); return; }

      const jobId = req.params.id as string;
      const job = await getParsedJobById(jobId);
      if (!job) { res.status(404).json({ error: "Job not found" }); return; }
      if (job.poster_telegram_id !== userId) {
        res.status(403).json({ error: "Not your job" });
        return;
      }

      const responses = await getJobResponses(jobId);
      const enriched = await Promise.all(responses.map(async (r) => {
        const rep = await getDetailedReputation(r.user_id);
        const ghProfile = await getGithubProfile(r.user_id);
        const trustScore = calcTrustScore(rep, {
          githubScore: ghProfile?.github_score ?? undefined,
          hasGithub: !!ghProfile,
        });
        const skillMatch = ghProfile?.languages && job.required_skills?.length
          ? calcSkillMatch(ghProfile.languages, job.required_skills)
          : undefined;
        return {
          ...r,
          executor: {
            user_id: r.user_id,
            github: ghProfile ? {
              username: ghProfile.username,
              avatar_url: ghProfile.avatar_url,
              languages: ghProfile.languages,
              github_score: ghProfile.github_score,
            } : null,
            trust_score: trustScore,
            skill_match: skillMatch,
            reputation: rep,
          },
        };
      }));

      res.json({ job, responses: enriched });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch responses" });
    }
  });

  // POST /api/my-jobs/:id/create-deal — create deal from job response
  app.post("/api/my-jobs/:id/create-deal", async (req, res) => {
    try {
      const userId = (req as any).telegramUserId as number;
      if (!userId) { res.status(401).json({ error: "User not identified" }); return; }

      const jobId = req.params.id as string;
      const job = await getParsedJobById(jobId);
      if (!job) { res.status(404).json({ error: "Job not found" }); return; }
      if (job.poster_telegram_id !== userId) {
        res.status(403).json({ error: "Not your job" });
        return;
      }

      const { respondent_user_id, amount, currency } = req.body;
      if (!respondent_user_id) {
        res.status(400).json({ error: "respondent_user_id required" });
        return;
      }

      // Verify respondent has actually responded
      if (!await hasUserResponded(jobId, respondent_user_id)) {
        res.status(400).json({ error: "User has not responded to this job" });
        return;
      }

      const dealAmount = amount || job.budget_max || 0;
      const dealCurrency = currency || job.currency || "TON";
      if (dealAmount <= 0) {
        res.status(400).json({ error: "Invalid amount" });
        return;
      }

      const dealId = `deal_job_${Date.now()}`;
      const deal = await createDeal({
        id: dealId,
        buyer_id: userId, // poster is buyer
        seller_id: respondent_user_id, // respondent is seller
        amount: dealAmount,
        currency: dealCurrency,
        description: job.description,
      });

      res.json(deal);
    } catch (e: any) {
      console.error("POST /api/my-jobs/:id/create-deal error:", e.message);
      res.status(500).json({ error: "Failed to create deal" });
    }
  });

  // GET /api/jobs/:id/has-responded — check if current user responded
  app.get("/api/jobs/:id/has-responded", async (req, res) => {
    try {
      const userId = (req as any).telegramUserId as number;
      if (!userId) { res.status(401).json({ error: "User not identified" }); return; }
      const responded = await hasUserResponded(req.params.id as string, userId);
      res.json({ responded });
    } catch {
      res.status(500).json({ error: "Failed to check response status" });
    }
  });

  // ========== Specs API ==========

  // GET /api/specs/:id — get spec by ID
  app.get("/api/specs/:id", async (req, res) => {
    try {
      const spec = await getSpecById(req.params.id as string);
      if (!spec) {
        res.status(404).json({ error: "Spec not found" });
        return;
      }
      res.json(spec);
    } catch (e: any) {
      console.error("GET /api/specs/:id error:", e.message);
      res.status(500).json({ error: "Failed to fetch spec" });
    }
  });

  // POST /api/specs — create a new spec
  app.post("/api/specs", async (req, res) => {
    try {
      const userId = (req as any).telegramUserId as number;
      if (!userId) { res.status(401).json({ error: "User not identified" }); return; }

      const { title, category, requirements, budget_min, budget_max, budget_currency } = req.body;
      if (!title || typeof title !== "string") {
        res.status(400).json({ error: "title is required" });
        return;
      }

      const specId = `spec_${Date.now()}_${userId}`;
      const spec = await createSpec({
        id: specId,
        creator_id: userId,
        title,
        category: category || undefined,
        requirements: requirements || undefined,
        budget_min: budget_min !== undefined ? Number(budget_min) : undefined,
        budget_max: budget_max !== undefined ? Number(budget_max) : undefined,
        budget_currency: budget_currency || "USD",
      });

      res.json(spec);
    } catch (e: any) {
      console.error("POST /api/specs error:", e.message);
      res.status(500).json({ error: "Failed to create spec" });
    }
  });

  // POST /api/specs/generate — AI generates spec from description
  app.post("/api/specs/generate", async (req, res) => {
    try {
      const userId = (req as any).telegramUserId as number;
      if (!userId) { res.status(401).json({ error: "User not identified" }); return; }

      const { description } = req.body;
      if (!description || typeof description !== "string") {
        res.status(400).json({ error: "description is required" });
        return;
      }

      const result = await generateSpecAI(description);
      res.json(result);
    } catch (e: any) {
      console.error("POST /api/specs/generate error:", e.message);
      res.status(500).json({ error: "Failed to generate spec" });
    }
  });

  // groups/top moved above auth middleware

  // ========== Admin API ==========

  // GET /api/admin/me — check admin status
  app.get("/api/admin/me", adminOnly, async (req, res) => {
    const userId = (req as any).telegramUserId as number;
    res.json({ is_admin: true, telegram_id: userId });
  });

  // GET /api/admin/dashboard — aggregate metrics
  app.get("/api/admin/dashboard", adminOnly, async (_req, res) => {
    try {
      const stats = await getAdminDashboardStats();
      res.json(stats);
    } catch (e: any) {
      console.error("Admin dashboard error:", e.message);
      res.status(500).json({ error: "Failed to fetch dashboard stats" });
    }
  });

  // --- Admin Sources ---

  app.get("/api/admin/sources", adminOnly, async (_req, res) => {
    try {
      const srcs = await getAllSources();
      res.json(srcs);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  });

  app.post("/api/admin/sources", adminOnly, async (req, res) => {
    try {
      const { telegram_id, title, username, type } = req.body;
      const sourceType = type === "channel_web" ? "channel_web" : "group";

      if (!title) {
        res.status(400).json({ error: "title is required" });
        return;
      }
      if (sourceType === "channel_web") {
        if (!username) {
          res.status(400).json({ error: "username is required for channel_web sources" });
          return;
        }
      } else {
        if (!telegram_id) {
          res.status(400).json({ error: "telegram_id is required for group sources" });
          return;
        }
      }

      const id = `src_${Date.now()}`;
      const source = await createSource({
        id,
        type: sourceType,
        telegram_id: telegram_id ? Number(telegram_id) : undefined,
        title,
        username: username || undefined,
        added_by: (req as any).telegramUserId,
      });
      res.json(source);
    } catch (e: any) {
      console.error("Create source error:", e.message);
      res.status(500).json({ error: "Failed to create source" });
    }
  });

  app.put("/api/admin/sources/:id", adminOnly, async (req, res) => {
    try {
      const { title, status, username } = req.body;
      await updateSource(req.params.id as string, { title, status, username });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to update source" });
    }
  });

  app.delete("/api/admin/sources/:id", adminOnly, async (req, res) => {
    try {
      await updateSource(req.params.id as string, { status: "disabled" });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to delete source" });
    }
  });

  // --- Admin Jobs ---

  app.get("/api/admin/jobs", adminOnly, async (req, res) => {
    try {
      const status = req.query.status ? (req.query.status as string).split(",") : undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await getParsedJobs({ status, page, limit });
      res.json({ data: result.data, total: result.total, page, limit });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch jobs" });
    }
  });

  app.put("/api/admin/jobs/:id/status", adminOnly, async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        res.status(400).json({ error: "status required" });
        return;
      }
      await updateJobStatus(req.params.id as string, status);
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to update job status" });
    }
  });

  // --- Admin Users ---

  app.get("/api/admin/users", adminOnly, async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await searchUsers({ search, page, limit });
      res.json({ data: result.data, total: result.total, page, limit });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/admin/users/:id", adminOnly, async (req, res) => {
    try {
      const userId = parseInt(req.params.id as string);
      if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }
      const rep = await getDetailedReputation(userId);
      const github = await getGithubProfile(userId);
      const wallet = await getUserWallet(userId);
      const userDeals = await getDealsByUser(userId);
      const userOffers = await getOffersByUser(userId);
      res.json({
        user_id: userId,
        reputation: rep,
        github,
        wallet_connected: !!wallet,
        deals_count: userDeals.length,
        offers_count: userOffers.length,
        recent_deals: userDeals.slice(0, 10),
      });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch user detail" });
    }
  });

  app.put("/api/admin/users/:id/ban", adminOnly, async (req, res) => {
    try {
      const userId = parseInt(req.params.id as string);
      if (isNaN(userId)) { res.status(400).json({ error: "Invalid user ID" }); return; }
      const { ban } = req.body;
      if (ban) {
        await banUser(userId);
      } else {
        await unbanUser(userId);
      }
      res.json({ ok: true, banned: !!ban });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to update ban status" });
    }
  });

  // --- Admin Disputes ---

  app.get("/api/admin/disputes", adminOnly, async (_req, res) => {
    try {
      const disputes = await getDisputeDeals();
      res.json(disputes);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch disputes" });
    }
  });

  app.post("/api/admin/disputes/:dealId/resolve", adminOnly, async (req, res) => {
    try {
      const { resolution_type, resolution_note } = req.body;
      if (!resolution_type || !["refund_buyer", "pay_seller"].includes(resolution_type)) {
        res.status(400).json({ error: "resolution_type must be refund_buyer or pay_seller" });
        return;
      }
      const adminId = (req as any).telegramUserId as number;
      await resolveDeal(req.params.dealId as string, {
        resolution_type,
        resolution_note: resolution_note || "",
        resolved_by: adminId,
      });
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to resolve dispute" });
    }
  });

  // --- Admin Settings ---

  app.get("/api/admin/settings", adminOnly, async (_req, res) => {
    try {
      const settings = await getAllSettings();
      res.json(settings);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/admin/settings", adminOnly, async (req, res) => {
    try {
      const adminId = (req as any).telegramUserId as number;
      const settings = req.body;
      for (const [key, value] of Object.entries(settings)) {
        await setSetting(key, value, adminId);
      }
      res.json({ ok: true });
    } catch (e: any) {
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });

  return app;
}
