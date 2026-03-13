// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 izEscrowAI contributors

import { createProvider } from "./provider.js";
import {
  getDetailedReputation, getDealById, saveRiskAssessment,
  getRiskAssessment, isRiskStale, type DetailedReputation,
} from "../db/index.js";
import {
  SYSTEM_PROMPT as DEFAULT_SYSTEM_PROMPT,
  MEDIATION_PROMPT as DEFAULT_MEDIATION_PROMPT,
  classifyMessageTool as defaultClassifyTool,
  parseDealTool as defaultParseDealTool,
  parseOfferTool as defaultParseOfferTool,
  parseBidTool as defaultParseBidTool,
} from "./prompts.default.js";
import type { AIPromptsConfig } from "./types.js";

// --- Loaded config (overridable via initAI) ---

let _config: AIPromptsConfig = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  mediationPrompt: DEFAULT_MEDIATION_PROMPT,
  classifyMessageTool: defaultClassifyTool,
  parseDealTool: defaultParseDealTool,
  parseOfferTool: defaultParseOfferTool,
  parseBidTool: defaultParseBidTool,
};

export async function initAI(): Promise<void> {
  // Try private config first (prompts.ts — gitignored, default export)
  try {
    // Use variable path to prevent TypeScript from resolving static types
    const privatePath = "./prompts.js";
    const mod: Record<string, unknown> = await import(privatePath);
    if (mod.default && typeof mod.default === "object" && "systemPrompt" in (mod.default as object)) {
      _config = mod.default as AIPromptsConfig;
      console.log("[ai] Using private prompts config");
      return;
    }
  } catch { /* no private config or no default export */ }

  // Fall back to public defaults (prompts.default.ts — committed)
  try {
    const mod = await import("./prompts.default.js");
    if (mod.default && typeof mod.default === "object" && "systemPrompt" in mod.default) {
      _config = mod.default as AIPromptsConfig;
      console.log("[ai] Using default prompts config (create prompts.ts to customize)");
      return;
    }
  } catch { /* no default config */ }

  console.log("[ai] Using inline prompts (no config files loaded)");
}

// --- Types ---

export interface ParsedDeal {
  seller_username: string | null;
  buyer_username: string | null;
  sender_role: "seller" | "buyer" | "unknown";
  amount: number | null;
  currency: string;
  description: string | null;
  missing_fields: string[];
}

export interface ParsedOffer {
  description: string;
  min_price: number | null;
  currency: string;
  role: "seller" | "buyer";
}

export type MessageIntent =
  | { type: "deal_creation"; parsed: ParsedDeal }
  | { type: "offer_creation"; parsed: ParsedOffer }
  | { type: "general_question"; answer: string }
  | { type: "deal_action"; action: string; details: string }
  | { type: "off_platform_payment" };

export interface DisputeResolution {
  seller_percent: number;
  buyer_percent: number;
  explanation: string;
}

// --- Helpers ---

interface ParseDealInput {
  sender_role: "seller" | "buyer" | "unknown";
  counterparty_username: string | null;
  amount: number | null;
  currency: string;
  description: string | null;
  missing_fields: string[];
}

function buildParsedDeal(input: ParseDealInput, senderUsername: string): ParsedDeal {
  return {
    seller_username:
      input.sender_role === "seller"
        ? senderUsername
        : input.sender_role === "buyer"
          ? input.counterparty_username
          : null,
    buyer_username:
      input.sender_role === "buyer"
        ? senderUsername
        : input.sender_role === "seller"
          ? input.counterparty_username
          : null,
    sender_role: input.sender_role || "unknown",
    amount: input.amount ?? null,
    currency: input.currency || "TON",
    description: input.description ?? null,
    missing_fields: input.missing_fields ?? [],
  };
}

// --- Public API ---

export async function classifyAndParse(
  userMessage: string,
  senderUsername: string,
): Promise<MessageIntent> {
  const provider = createProvider();
  const response = await provider.getClient().chat.completions.create({
    model: provider.getModel(),
    max_tokens: 1024,
    messages: [
      { role: "system", content: _config.systemPrompt },
      { role: "user", content: `Message from @${senderUsername}: "${userMessage}"` },
    ],
    tools: [_config.classifyMessageTool, _config.parseDealTool],
  });

  const message = response.choices[0]?.message;
  if (!message) {
    return { type: "general_question", answer: "Processing error. Please try again." };
  }

  // Process tool calls
  const toolCalls = message.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      const args = JSON.parse(call.function.arguments);

      if (call.function.name === "classify_message") {
        if (args.intent === "deal_creation") {
          return await parseDealMessage(userMessage, senderUsername);
        }

        if (args.intent === "offer_creation") {
          return await parseOfferMessage(userMessage);
        }

        if (args.intent === "deal_action") {
          return { type: "deal_action", action: args.intent, details: args.answer ?? "" };
        }

        if (args.intent === "off_platform_payment") {
          return { type: "off_platform_payment" };
        }

        return {
          type: "general_question",
          answer:
            args.answer ??
            "I help with safe P2P deals. Try something like: 'Selling logo design to @ivan for 50 TON'",
        };
      }

      if (call.function.name === "parse_deal") {
        return { type: "deal_creation", parsed: buildParsedDeal(args, senderUsername) };
      }
    }
  }

  // Fallback: text response
  return {
    type: "general_question",
    answer:
      message.content ??
      "Describe your deal, e.g.: 'Selling logo design to @ivan for 50 TON'",
  };
}

async function parseDealMessage(
  userMessage: string,
  senderUsername: string,
): Promise<MessageIntent> {
  const provider = createProvider();
  const response = await provider.getClient().chat.completions.create({
    model: provider.getModel(),
    max_tokens: 1024,
    messages: [
      { role: "system", content: _config.systemPrompt },
      { role: "user", content: `Parse this deal message from @${senderUsername}: "${userMessage}"` },
    ],
    tools: [_config.parseDealTool],
  });

  const message = response.choices[0]?.message;
  const toolCalls = message?.tool_calls;

  if (toolCalls && toolCalls.length > 0) {
    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      if (call.function.name === "parse_deal") {
        const args = JSON.parse(call.function.arguments);
        return { type: "deal_creation", parsed: buildParsedDeal(args, senderUsername) };
      }
    }
  }

  return {
    type: "general_question",
    answer: "Could not parse the deal. Try: 'Selling logo design to @ivan for 50 TON'",
  };
}

// --- Offer Parsing ---

async function parseOfferMessage(userMessage: string): Promise<MessageIntent> {
  const provider = createProvider();
  const response = await provider.getClient().chat.completions.create({
    model: provider.getModel(),
    max_tokens: 512,
    messages: [
      { role: "system", content: _config.systemPrompt },
      { role: "user", content: `Parse this public offer message: "${userMessage}"` },
    ],
    tools: [_config.parseOfferTool],
  });

  const message = response.choices[0]?.message;
  const toolCalls = message?.tool_calls;

  if (toolCalls && toolCalls.length > 0) {
    for (const call of toolCalls) {
      if (call.type !== "function" || call.function.name !== "parse_offer") continue;
      const args = JSON.parse(call.function.arguments);
      return {
        type: "offer_creation",
        parsed: {
          description: args.description ?? userMessage,
          min_price: args.min_price ?? null,
          currency: args.currency ?? "TON",
          role: args.role ?? "buyer",
        },
      };
    }
  }

  return {
    type: "offer_creation",
    parsed: { description: userMessage, min_price: null, currency: "TON", role: "buyer" },
  };
}

export async function parseOffer(text: string): Promise<ParsedOffer> {
  const result = await parseOfferMessage(text);
  if (result.type === "offer_creation") return result.parsed;
  return { description: text, min_price: null, currency: "TON", role: "buyer" };
}

export async function parseBid(text: string): Promise<{ price: number | null; message: string | null }> {
  const provider = createProvider();
  const response = await provider.getClient().chat.completions.create({
    model: provider.getModel(),
    max_tokens: 256,
    messages: [
      { role: "system", content: "Extract the bid price from the user's message. The user is submitting a price for a job/offer." },
      { role: "user", content: text },
    ],
    tools: [_config.parseBidTool],
  });

  const toolCalls = response.choices[0]?.message?.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    for (const call of toolCalls) {
      if (call.type !== "function" || call.function.name !== "parse_bid") continue;
      const args = JSON.parse(call.function.arguments);
      return { price: args.price ?? null, message: args.message ?? null };
    }
  }

  // Try simple number extraction as fallback
  const match = text.match(/[\d.]+/);
  return { price: match ? parseFloat(match[0]) : null, message: null };
}

export function generateOfferPreview(parsed: ParsedOffer): string {
  const roleEmoji = parsed.role === "seller" ? "🛠" : "🔍";
  const roleLabel = parsed.role === "seller" ? "Offering" : "Looking for";
  const priceStr = parsed.min_price
    ? `${parsed.min_price} ${parsed.currency}`
    : "Price negotiable";

  return `${roleEmoji} ${roleLabel}: ${parsed.description}\n💰 ${priceStr}\n\nPowered by izEscrowAI — safe P2P deals on TON`;
}

// --- Dispute Mediation ---

export async function mediateDispute(
  dealDescription: string,
  dealAmount: number,
  dealCurrency: string,
  disputeReason: string,
  sellerEvidence: string,
  buyerEvidence: string,
): Promise<DisputeResolution> {
  const provider = createProvider();
  const response = await provider.getClient().chat.completions.create({
    model: provider.getModel(),
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content: _config.mediationPrompt,
      },
      {
        role: "user",
        content: `Deal: ${dealDescription}
Amount: ${dealAmount} ${dealCurrency}

Dispute reason: ${disputeReason}

Seller's position: ${sellerEvidence || "No evidence provided"}

Buyer's position: ${buyerEvidence || "No evidence provided"}

Propose a fair resolution with split percentages and explanation.
Respond as JSON: {"seller_percent": number, "buyer_percent": number, "explanation": "string"}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          seller_percent: parsed.seller_percent ?? 50,
          buyer_percent: parsed.buyer_percent ?? 50,
          explanation: parsed.explanation ?? "Equal split by default.",
        };
      }
    } catch {
      // fallback
    }
  }

  return {
    seller_percent: 50,
    buyer_percent: 50,
    explanation: "Not enough data for an accurate assessment. Proposing an equal 50/50 split.",
  };
}

// --- Trust Score & Risk Assessment ---

/**
 * Calculate platform sub-score from reputation (0-100)
 */
function calcPlatformScore(rep: DetailedReputation): number {
  if (rep.completed_deals < 3) return 50; // neutral default for new users

  const avgRating = rep.avg_rating || 0;
  const ratingScore = (avgRating / 5) * 100;
  const dealsScore = Math.min(100, (Math.log(rep.completed_deals + 1) / Math.log(51)) * 100);
  const totalDeals = rep.completed_deals + rep.cancelled_deals;
  const disputeFreeRate = totalDeals > 0
    ? ((totalDeals - rep.disputes_opened) / totalDeals) * 100
    : 100;
  const avgDays = rep.avg_completion_days ?? 7;
  const speedScore = Math.max(0, Math.min(100, 100 - ((avgDays - 1) / 29) * 100));
  const repeatScore = Math.min(100, (Math.log(rep.repeat_clients + 1) / Math.log(21)) * 100);

  return Math.round(ratingScore * 0.3 + dealsScore * 0.25 + disputeFreeRate * 0.2 + speedScore * 0.15 + repeatScore * 0.1);
}

export interface TrustScoreBreakdown {
  total: number;
  platform: number;
  github: number;
  wallet: number;
  verification: number;
}

/**
 * Composite Trust Score (GTS-3):
 * Platform 40% + GitHub 30% + Wallet 20% + Verification 10%
 */
export function calcTrustScore(
  rep: DetailedReputation,
  opts?: { githubScore?: number | null; hasGithub?: boolean; hasWallet?: boolean },
): number {
  const platform = calcPlatformScore(rep);
  const github = opts?.githubScore ?? 50; // neutral if not linked
  const wallet = 50; // placeholder until TON wallet scoring
  // Verification: +4 telegram (always true), +4 github if linked, +2 wallet if connected
  let verif = 40; // base: telegram verified (4 out of 10 → scaled to 0-100: 40)
  if (opts?.hasGithub) verif += 40;
  if (opts?.hasWallet) verif += 20;

  const score = platform * 0.4 + github * 0.3 + wallet * 0.2 + verif * 0.1;
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Get full Trust Score breakdown for display
 */
export function calcTrustScoreBreakdown(
  rep: DetailedReputation,
  opts?: { githubScore?: number | null; hasGithub?: boolean; hasWallet?: boolean },
): TrustScoreBreakdown {
  const platform = calcPlatformScore(rep);
  const github = opts?.githubScore ?? 50;
  const wallet = 50;
  let verification = 40;
  if (opts?.hasGithub) verification += 40;
  if (opts?.hasWallet) verification += 20;

  const total = Math.round(Math.max(0, Math.min(100,
    platform * 0.4 + github * 0.3 + wallet * 0.2 + verification * 0.1
  )));

  return { total, platform, github, wallet, verification };
}

export interface RiskResult {
  score: number;
  level: "low" | "medium" | "high";
  factors: string[];
  recommendations: string[];
}

export async function assessRisk(userId: number): Promise<RiskResult> {
  // Check cache first
  if (!(await isRiskStale(userId))) {
    const cached = await getRiskAssessment(userId);
    if (cached) {
      const factors = (typeof cached.factors === "string" ? JSON.parse(cached.factors) : cached.factors) as { factors: string[]; recommendations: string[] };
      return {
        score: cached.score,
        level: cached.level as "low" | "medium" | "high",
        factors: factors.factors ?? [],
        recommendations: factors.recommendations ?? [],
      };
    }
  }

  const rep = await getDetailedReputation(userId);
  const trustScore = calcTrustScore(rep);

  const provider = createProvider();
  const response = await provider.getClient().chat.completions.create({
    model: provider.getModel(),
    max_tokens: 512,
    messages: [
      {
        role: "system",
        content: "You are a risk assessment AI for a P2P escrow platform. Analyze user metrics and return a risk assessment. Respond in English as JSON: {\"score\": 0-100, \"level\": \"low\"|\"medium\"|\"high\", \"factors\": [\"string\"], \"recommendations\": [\"string\"]}",
      },
      {
        role: "user",
        content: `Assess risk for user with these metrics:
- Completed deals: ${rep.completed_deals}
- Average rating: ${rep.avg_rating.toFixed(1)}/5
- Trust Score: ${trustScore ?? "N/A (new user)"}
- Cancelled deals: ${rep.cancelled_deals}
- Disputes opened: ${rep.disputes_opened}
- Disputes lost: ${rep.disputes_lost}
- Avg completion time: ${rep.avg_completion_days?.toFixed(1) ?? "N/A"} days
- Repeat clients: ${rep.repeat_clients}`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content;
  let result: RiskResult = { score: 50, level: "medium", factors: [], recommendations: [] };

  if (text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        result = {
          score: parsed.score ?? 50,
          level: parsed.level ?? "medium",
          factors: parsed.factors ?? [],
          recommendations: parsed.recommendations ?? [],
        };
      }
    } catch {
      // use default
    }
  }

  // Cache result
  await saveRiskAssessment({
    user_id: userId,
    score: result.score,
    level: result.level,
    factors: JSON.stringify({ factors: result.factors, recommendations: result.recommendations }),
  });

  return result;
}

export interface DealRiskResult {
  buyer_risk: RiskResult;
  seller_risk: RiskResult;
  deal_recommendations: string[];
}

export async function assessDealRisk(dealId: string): Promise<DealRiskResult> {
  const deal = await getDealById(dealId);
  if (!deal) {
    return {
      buyer_risk: { score: 50, level: "medium", factors: ["Deal not found"], recommendations: [] },
      seller_risk: { score: 50, level: "medium", factors: ["Deal not found"], recommendations: [] },
      deal_recommendations: [],
    };
  }

  const [buyerRisk, sellerRisk] = await Promise.all([
    assessRisk(deal.buyer_id),
    assessRisk(deal.seller_id),
  ]);

  const buyerRep = await getDetailedReputation(deal.buyer_id);
  const sellerRep = await getDetailedReputation(deal.seller_id);

  const dealRecommendations: string[] = [];

  // Check for unusual amount
  const sellerAvgDeal = sellerRep.completed_deals > 0 ? deal.amount : 0;
  if (sellerRep.completed_deals > 3 && deal.amount > sellerAvgDeal * 3) {
    dealRecommendations.push("Deal amount is significantly higher than seller's average — consider splitting into milestones.");
  }

  if (buyerRep.completed_deals < 3) {
    dealRecommendations.push("Buyer is new to the platform — consider starting with a smaller deal.");
  }

  if (sellerRep.completed_deals < 3) {
    dealRecommendations.push("Seller is new to the platform — verify their portfolio before proceeding.");
  }

  return { buyer_risk: buyerRisk, seller_risk: sellerRisk, deal_recommendations: dealRecommendations };
}

// --- Skill Matching ---

const SKILL_KEYWORDS: Record<string, string[]> = {
  frontend: ["TypeScript", "JavaScript", "React", "Vue", "Angular", "CSS", "HTML", "Next.js", "Svelte"],
  backend: ["Python", "Go", "Rust", "Java", "Node.js", "TypeScript", "C#", "PHP", "Ruby"],
  mobile: ["Swift", "Kotlin", "Dart", "React Native", "Flutter", "Java", "Objective-C"],
  blockchain: ["Solidity", "Rust", "FunC", "Tact", "Move", "TypeScript"],
  devops: ["Docker", "Kubernetes", "Terraform", "Python", "Shell", "Go", "YAML"],
  data: ["Python", "R", "SQL", "Scala", "Julia"],
  design: ["Figma", "Sketch", "Adobe XD"],
  ai: ["Python", "TypeScript", "Jupyter Notebook", "C++", "Rust"],
};

const extractSkillsTool = {
  type: "function" as const,
  function: {
    name: "extract_required_skills",
    description: "Extract required technical skills/languages from a job description",
    parameters: {
      type: "object",
      properties: {
        skills: {
          type: "array",
          items: { type: "string" },
          description: "List of programming languages or technical skills required (e.g. TypeScript, React, Python, Solidity)",
        },
        category: {
          type: "string",
          enum: ["frontend", "backend", "mobile", "blockchain", "devops", "data", "design", "ai", "other"],
          description: "Primary category of the job",
        },
      },
      required: ["skills", "category"],
    },
  },
};

export async function extractSkills(description: string): Promise<string[]> {
  const provider = createProvider();
  const response = await provider.getClient().chat.completions.create({
    model: provider.getModel(),
    max_tokens: 256,
    messages: [
      {
        role: "system",
        content: "You extract required programming languages and technical skills from job/offer descriptions. Return skills as specific language/framework names that can be matched against a GitHub profile's languages.",
      },
      { role: "user", content: description },
    ],
    tools: [extractSkillsTool],
  });

  const toolCalls = response.choices[0]?.message?.tool_calls;
  if (toolCalls && toolCalls.length > 0) {
    for (const call of toolCalls) {
      if (call.type !== "function" || call.function.name !== "extract_required_skills") continue;
      const args = JSON.parse(call.function.arguments);
      if (args.skills && Array.isArray(args.skills) && args.skills.length > 0) {
        return args.skills;
      }
      // Fallback to category keywords
      if (args.category && SKILL_KEYWORDS[args.category]) {
        return SKILL_KEYWORDS[args.category];
      }
    }
  }

  // Fallback: no skills extracted
  return [];
}

export interface SkillMatchResult {
  match_percent: number;
  matched: string[];
  missing: string[];
}

export function calcSkillMatch(
  userLanguages: Record<string, number>,
  requiredSkills: string[],
): SkillMatchResult {
  if (requiredSkills.length === 0) {
    return { match_percent: 100, matched: [], missing: [] };
  }

  const userLangs = new Set(Object.keys(userLanguages).map(l => l.toLowerCase()));
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of requiredSkills) {
    if (userLangs.has(skill.toLowerCase())) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const match_percent = Math.round((matched.length / requiredSkills.length) * 100);
  return { match_percent, matched, missing };
}

// --- Job Parsing AI Tools ---

const classifyGroupMessageTool = {
  type: "function" as const,
  function: {
    name: "classify_group_message",
    description: "Classify a Telegram group message as a job posting, not a job, or spam",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["job", "not_job", "spam"], description: "Message classification" },
        confidence: { type: "number", description: "Confidence score 0-1" },
      },
      required: ["type", "confidence"],
    },
  },
};

export async function classifyGroupMessage(text: string): Promise<{ type: "job" | "not_job" | "spam"; confidence: number }> {
  const provider = createProvider();
  const res = await provider.getClient().chat.completions.create({
    model: provider.getModel(),
    messages: [
      { role: "system", content: "You classify Telegram group messages. Determine if a message is a freelance job posting (job), general chat/question (not_job), or spam/ads (spam). Job posts typically describe work needed, mention skills, budgets, or deadlines." },
      { role: "user", content: text },
    ],
    tools: [classifyGroupMessageTool],
    tool_choice: { type: "function", function: { name: "classify_group_message" } },
  });

  const call = res.choices[0]?.message?.tool_calls?.[0];
  if (call && call.type === "function") {
    try {
      return JSON.parse(call.function.arguments);
    } catch {}
  }
  return { type: "not_job", confidence: 0 };
}

const extractJobParamsTool = {
  type: "function" as const,
  function: {
    name: "extract_job_params",
    description: "Extract structured parameters from a freelance job posting message",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short job title (max 100 chars)" },
        description: { type: "string", description: "Full job description" },
        budget_min: { type: "number", description: "Minimum budget (null if not mentioned)" },
        budget_max: { type: "number", description: "Maximum budget (null if not mentioned)" },
        currency: { type: "string", enum: ["RUB", "USD", "USDT", "TON", "EUR"], description: "Budget currency, default RUB" },
        required_skills: { type: "array", items: { type: "string" }, description: "List of required skills/technologies" },
        deadline: { type: "string", description: "Deadline as ISO date string (null if not mentioned)" },
        contact_username: { type: "string", description: "Telegram @username of the poster (null if not found)" },
        contact_url: { type: "string", description: "URL or t.me link for contact (null if not found)" },
      },
      required: ["title", "description", "required_skills"],
    },
  },
};

export interface ExtractedJobParams {
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  required_skills: string[];
  deadline: string | null;
  contact_username: string | null;
  contact_url: string | null;
}

export async function extractJobParams(text: string): Promise<ExtractedJobParams | null> {
  const provider = createProvider();
  const res = await provider.getClient().chat.completions.create({
    model: provider.getModel(),
    messages: [
      { role: "system", content: "Extract structured job parameters from a freelance job posting. Extract skills as normalized technology names (e.g., 'React', 'Python', 'Node.js'). If budget is mentioned as a range like '50-100к', extract budget_min=50000 and budget_max=100000. If a single price, set both min and max to the same value. Look for @username mentions for contact." },
      { role: "user", content: text },
    ],
    tools: [extractJobParamsTool],
    tool_choice: { type: "function", function: { name: "extract_job_params" } },
  });

  const call = res.choices[0]?.message?.tool_calls?.[0];
  if (call && call.type === "function") {
    try {
      const params = JSON.parse(call.function.arguments);
      return {
        title: params.title || "Untitled Job",
        description: params.description || text.slice(0, 500),
        budget_min: params.budget_min ?? null,
        budget_max: params.budget_max ?? null,
        currency: params.currency || "RUB",
        required_skills: params.required_skills || [],
        deadline: params.deadline ?? null,
        contact_username: params.contact_username ?? null,
        contact_url: params.contact_url ?? null,
      };
    } catch {}
  }
  return null;
}

// --- Proposal Generation ---

export async function generateProposal(jobDescription: string, jobSkills: string[], userProfile: {
  username: string;
  languages: Record<string, number>;
  top_repos: Array<{ name: string; stars: number; language: string | null }>;
  total_commits_year: number;
  github_score: number | null;
}): Promise<string> {
  const provider = createProvider();
  const profileSummary = `GitHub: @${userProfile.username}, Languages: ${Object.keys(userProfile.languages).join(", ")}, Top repos: ${userProfile.top_repos.slice(0, 3).map(r => `${r.name} (${r.language}, ${r.stars}★)`).join(", ")}, ${userProfile.total_commits_year} commits/year, score: ${userProfile.github_score ?? "N/A"}`;

  const res = await provider.getClient().chat.completions.create({
    model: provider.getModel(),
    messages: [
      { role: "system", content: "Generate a concise, professional freelance proposal (2-3 paragraphs, in Russian) for a job posting. Highlight the developer's relevant experience based on their GitHub profile. Be specific about matching skills. Keep it friendly and professional. Do not include greetings like 'Здравствуйте' at the start." },
      { role: "user", content: `Job: ${jobDescription}\nRequired skills: ${jobSkills.join(", ")}\nDeveloper profile: ${profileSummary}` },
    ],
  });

  return res.choices[0]?.message?.content || "Не удалось сгенерировать предложение.";
}
