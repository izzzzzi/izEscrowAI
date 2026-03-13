// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 izEscrowAI contributors

import { createProvider } from "./provider.js";
import {
  getDetailedReputation, getDealById, saveRiskAssessment,
  getRiskAssessment, isRiskStale, type DetailedReputation,
} from "../db/index.js";
import defaultPrompts from "./prompts.default.js";
import type { AIPromptsConfig } from "./types.js";

// --- Loaded config (overridable via initAI) ---

let _config: AIPromptsConfig = { ...defaultPrompts };

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
  | { type: "off_platform_payment" }
  | { type: "spec_creation"; description: string }
  | { type: "pricing_request"; description: string };

export interface DisputeResolution {
  seller_percent: number;
  buyer_percent: number;
  explanation: string;
}

// --- Spec Generator Types ---

export interface GeneratedSpec {
  type: "spec";
  title: string;
  category: string;
  requirements: string[];
  budget_range: { min: number; max: number; currency: string } | null;
}

export interface ClarifyingQuestions {
  type: "questions";
  questions: string[];
}

// --- Compliance Types ---

export interface ComplianceAssessment {
  criterion: string;
  status: "met" | "partial" | "not_met";
  evidence: string;
  weight: number;
}

export interface ComplianceResult {
  assessments: ComplianceAssessment[];
  score: number;
  report: string;
}

// --- Pricing Types ---

export interface PriceEstimate {
  min: number;
  median: number;
  max: number;
  recommended: number;
  currency: string;
  reasoning: string;
  factors: string[];
}

// --- Conversation State ---

export interface ConversationState {
  history: Array<{ role: string; content: string }>;
  createdAt: number;
  lastActivity: number;
}

/** In-memory conversation state for spec generation with 10-minute auto-expiry */
export const specConversations = new Map<number, ConversationState>();

const CONVERSATION_TTL_MS = 10 * 60 * 1000; // 10 minutes

function cleanExpiredConversations(): void {
  const now = Date.now();
  for (const [chatId, state] of specConversations) {
    if (now - state.lastActivity > CONVERSATION_TTL_MS) {
      specConversations.delete(chatId);
    }
  }
}

// Periodically clean expired conversations every 2 minutes
setInterval(cleanExpiredConversations, 2 * 60 * 1000).unref();

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

        if (args.intent === "spec_creation") {
          return { type: "spec_creation", description: args.answer ?? userMessage };
        }

        if (args.intent === "pricing_request") {
          return { type: "pricing_request", description: args.answer ?? userMessage };
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

// --- AI Spec Generator (Section 2) ---

const generateSpecTool = {
  type: "function" as const,
  function: {
    name: "generate_spec",
    description: "Generate a structured project specification from a description. Call this when the description is clear enough to produce a spec.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short project title (max 100 chars)",
        },
        category: {
          type: "string",
          enum: ["frontend", "backend", "mobile", "blockchain", "devops", "data", "design", "ai", "fullstack", "other"],
          description: "Primary category of the project",
        },
        requirements: {
          type: "array",
          items: { type: "string" },
          description: "List of specific, measurable requirements / acceptance criteria",
        },
        budget_range: {
          type: "object",
          properties: {
            min: { type: "number", description: "Minimum estimated budget" },
            max: { type: "number", description: "Maximum estimated budget" },
            currency: { type: "string", enum: ["USD", "EUR", "RUB", "TON", "USDT"], description: "Budget currency" },
          },
          required: ["min", "max", "currency"],
          description: "Estimated budget range, or null if not determinable",
        },
      },
      required: ["title", "category", "requirements"],
    },
  },
};

const askClarifyingQuestionsTool = {
  type: "function" as const,
  function: {
    name: "ask_clarifying_questions",
    description: "Ask clarifying questions when the project description is too vague or ambiguous to generate a proper spec.",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: { type: "string" },
          description: "List of specific clarifying questions to ask the user (2-5 questions)",
        },
      },
      required: ["questions"],
    },
  },
};

const SPEC_GENERATION_PROMPT = `You are an expert project specification writer for a freelance escrow platform.
Your job is to generate detailed, structured project specifications from user descriptions.

Rules:
- If the description is clear and detailed enough, generate a full spec using generate_spec.
- If the description is too vague, ambiguous, or missing critical details, use ask_clarifying_questions to request more info.
- Requirements should be specific, measurable, and testable acceptance criteria.
- Each requirement should be a single, verifiable item (not a compound requirement).
- Budget range should be realistic for the scope described. Set to null if you cannot estimate.
- Title should be concise but descriptive.
- Always respond in English regardless of input language.`;

export async function generateSpec(
  description: string,
  conversationHistory?: Array<{ role: string; content: string }>,
): Promise<GeneratedSpec | ClarifyingQuestions> {
  const provider = createProvider();

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SPEC_GENERATION_PROMPT },
  ];

  // Add conversation history if present (multi-turn)
  if (conversationHistory && conversationHistory.length > 0) {
    for (const msg of conversationHistory) {
      messages.push({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      });
    }
  }

  messages.push({ role: "user", content: description });

  const response = await provider.getClient().chat.completions.create({
    model: provider.getModel(),
    max_tokens: 1024,
    messages,
    tools: [generateSpecTool, askClarifyingQuestionsTool],
  });

  const message = response.choices[0]?.message;
  const toolCalls = message?.tool_calls;

  if (toolCalls && toolCalls.length > 0) {
    for (const call of toolCalls) {
      if (call.type !== "function") continue;

      if (call.function.name === "generate_spec") {
        const args = JSON.parse(call.function.arguments);
        return {
          type: "spec",
          title: args.title ?? "Untitled Project",
          category: args.category ?? "other",
          requirements: args.requirements ?? [],
          budget_range: args.budget_range ?? null,
        };
      }

      if (call.function.name === "ask_clarifying_questions") {
        const args = JSON.parse(call.function.arguments);
        return {
          type: "questions",
          questions: args.questions ?? ["Could you provide more details about the project?"],
        };
      }
    }
  }

  // Fallback: return clarifying questions
  return {
    type: "questions",
    questions: ["Could you describe the project in more detail? What should it do, and who is it for?"],
  };
}

// --- Spec-Based Arbitration (Section 3) ---

const evaluateComplianceTool = {
  type: "function" as const,
  function: {
    name: "evaluate_compliance",
    description: "Evaluate how well delivered work meets spec requirements. Produce per-criterion assessments.",
    parameters: {
      type: "object",
      properties: {
        assessments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              criterion: { type: "string", description: "The requirement being evaluated" },
              status: { type: "string", enum: ["met", "partial", "not_met"], description: "Whether the requirement was fulfilled" },
              evidence: { type: "string", description: "Evidence or reasoning for the status determination" },
              weight: { type: "number", description: "Importance weight 1-10 (10 = critical)" },
            },
            required: ["criterion", "status", "evidence", "weight"],
          },
          description: "Per-criterion compliance assessments",
        },
      },
      required: ["assessments"],
    },
  },
};

const COMPLIANCE_EVALUATION_PROMPT = `You are an impartial AI arbitrator for a freelance escrow platform.
You evaluate whether delivered work meets the agreed-upon project specification.

For each requirement in the spec, assess:
- "met": requirement is fully satisfied with clear evidence
- "partial": requirement is partially satisfied or has minor issues
- "not_met": requirement is clearly not satisfied

Weight each criterion from 1-10 based on importance:
- 10: Core functionality, critical deliverable
- 7-9: Important features, significant requirements
- 4-6: Nice-to-have features, secondary requirements
- 1-3: Minor details, cosmetic items

Be fair and evidence-based. Consider both seller's delivery evidence and buyer's claims.
Always respond in English.`;

export async function evaluateSpecCompliance(
  spec: { title: string; requirements: string[] },
  disputeContext: string,
  sellerEvidence: string,
  buyerEvidence: string,
): Promise<ComplianceResult> {
  const provider = createProvider();

  const response = await provider.getClient().chat.completions.create({
    model: provider.getModel(),
    max_tokens: 2048,
    messages: [
      { role: "system", content: COMPLIANCE_EVALUATION_PROMPT },
      {
        role: "user",
        content: `Project Spec: "${spec.title}"
Requirements:
${spec.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}

Dispute Context: ${disputeContext || "General compliance review"}

Seller's Evidence: ${sellerEvidence || "No evidence provided"}

Buyer's Position: ${buyerEvidence || "No position provided"}

Evaluate each requirement against the evidence.`,
      },
    ],
    tools: [evaluateComplianceTool],
    tool_choice: { type: "function", function: { name: "evaluate_compliance" } },
  });

  const call = response.choices[0]?.message?.tool_calls?.[0];
  if (call && call.type === "function" && call.function.name === "evaluate_compliance") {
    try {
      const args = JSON.parse(call.function.arguments);
      const assessments: ComplianceAssessment[] = (args.assessments ?? []).map((a: Record<string, unknown>) => ({
        criterion: (a.criterion as string) ?? "Unknown",
        status: (a.status as string) ?? "not_met",
        evidence: (a.evidence as string) ?? "",
        weight: (a.weight as number) ?? 5,
      }));

      const score = calculateComplianceScore(assessments);
      const report = formatArbitrationReport(assessments, score);

      return { assessments, score, report };
    } catch {
      // fall through to default
    }
  }

  // Fallback: cannot evaluate
  const defaultAssessments: ComplianceAssessment[] = spec.requirements.map((r) => ({
    criterion: r,
    status: "partial" as const,
    evidence: "Insufficient evidence to make a definitive determination.",
    weight: 5,
  }));
  const score = calculateComplianceScore(defaultAssessments);
  const report = formatArbitrationReport(defaultAssessments, score);

  return { assessments: defaultAssessments, score, report };
}

/**
 * Calculate weighted compliance score (0-100).
 * met = 100%, partial = 50%, not_met = 0%.
 */
export function calculateComplianceScore(assessments: ComplianceAssessment[]): number {
  if (assessments.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const a of assessments) {
    const statusScore = a.status === "met" ? 100 : a.status === "partial" ? 50 : 0;
    weightedSum += statusScore * a.weight;
    totalWeight += a.weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

/**
 * Format an arbitration report with emoji indicators and recommended split.
 */
export function formatArbitrationReport(
  assessments: ComplianceAssessment[],
  score: number,
): string {
  const statusEmoji: Record<string, string> = {
    met: "\u2705",       // checkmark
    partial: "\u26A0\uFE0F", // warning
    not_met: "\u274C",    // cross
  };

  const lines: string[] = [];
  lines.push("=== Arbitration Report ===");
  lines.push("");

  for (const a of assessments) {
    const emoji = statusEmoji[a.status] ?? "\u2753";
    const statusLabel = a.status === "met" ? "Met" : a.status === "partial" ? "Partial" : "Not Met";
    lines.push(`${emoji} ${a.criterion}`);
    lines.push(`   Status: ${statusLabel} | Weight: ${a.weight}/10`);
    lines.push(`   ${a.evidence}`);
    lines.push("");
  }

  lines.push(`Overall Compliance Score: ${score}%`);
  lines.push("");

  // Recommended split based on score
  const sellerPercent = Math.round(score);
  const buyerPercent = 100 - sellerPercent;
  lines.push(`Recommended Split: Seller ${sellerPercent}% / Buyer ${buyerPercent}%`);

  return lines.join("\n");
}

// --- AI Pricing Engine (Section 4) ---

const estimatePriceTool = {
  type: "function" as const,
  function: {
    name: "estimate_price",
    description: "Estimate the price range for a project based on its specification.",
    parameters: {
      type: "object",
      properties: {
        min: { type: "number", description: "Minimum realistic price" },
        median: { type: "number", description: "Median market price" },
        max: { type: "number", description: "Maximum price for premium quality" },
        recommended: { type: "number", description: "Recommended price balancing quality and value" },
        currency: { type: "string", enum: ["USD", "EUR", "RUB", "TON", "USDT"], description: "Price currency" },
        reasoning: { type: "string", description: "Brief explanation of the pricing rationale" },
        factors: {
          type: "array",
          items: { type: "string" },
          description: "Key factors that influence the price (complexity, timeline, skills required, etc.)",
        },
      },
      required: ["min", "median", "max", "recommended", "currency", "reasoning", "factors"],
    },
  },
};

const PRICING_PROMPT = `You are an expert pricing engine for a freelance escrow platform.
Given a project specification, estimate a realistic price range based on:

1. Project complexity and scope (number and difficulty of requirements)
2. Required technical skills and their market rates
3. Estimated time to complete
4. Market rates for freelance work in the given category

Return prices in the spec's currency if provided, otherwise default to USD.
Be realistic — base estimates on actual freelance market rates.
Always provide a min (budget/junior), median (market rate), max (premium/senior), and recommended price.
The recommended price should balance quality and value for a typical deal.
Always respond in English.`;

export async function estimatePrice(
  spec: { title: string; category: string; requirements: string[]; budget_currency?: string },
): Promise<PriceEstimate> {
  const provider = createProvider();

  const response = await provider.getClient().chat.completions.create({
    model: provider.getModel(),
    max_tokens: 1024,
    messages: [
      { role: "system", content: PRICING_PROMPT },
      {
        role: "user",
        content: `Project: "${spec.title}"
Category: ${spec.category}
Requirements:
${spec.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}
${spec.budget_currency ? `Preferred currency: ${spec.budget_currency}` : "Currency: USD"}

Estimate the price range for this project.`,
      },
    ],
    tools: [estimatePriceTool],
    tool_choice: { type: "function", function: { name: "estimate_price" } },
  });

  const call = response.choices[0]?.message?.tool_calls?.[0];
  if (call && call.type === "function" && call.function.name === "estimate_price") {
    try {
      const args = JSON.parse(call.function.arguments);
      return {
        min: args.min ?? 0,
        median: args.median ?? 0,
        max: args.max ?? 0,
        recommended: args.recommended ?? args.median ?? 0,
        currency: args.currency ?? spec.budget_currency ?? "USD",
        reasoning: args.reasoning ?? "No reasoning provided.",
        factors: args.factors ?? [],
      };
    } catch {
      // fall through to default
    }
  }

  // Fallback
  return {
    min: 0,
    median: 0,
    max: 0,
    recommended: 0,
    currency: spec.budget_currency ?? "USD",
    reasoning: "Unable to estimate price. Please provide more project details.",
    factors: [],
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
      { role: "system", content: `You classify Telegram channel/group messages for a freelance escrow platform. Classify as:

"job" — a PROJECT-BASED FREELANCE ORDER where someone is looking to hire a freelancer for a specific task with a concrete deliverable. Positive signals:
- Specific deliverable ("нужен лендинг", "сделать бота", "дизайн логотипа", "need a landing page")
- Project-based budget ("бюджет 50к", "$500", "оплата за проект")
- One-off or short-term scope with a defined result
- Keywords: "заказ", "проект", "задача", "нужен", "ищу исполнителя", "ТЗ"

"not_job" — anything that is NOT a freelance project order. This includes:
- Full-time job vacancies ("в команду", "в штат", "join our team", "we're hiring", "position")
- Salary-based compensation ("зарплата 200к/мес", "salary $5000/month")
- Corporate hiring ("The team is looking for...", "мы ищём в команду")
- News, opinions, articles, discussions, channel updates
- Non-digital/non-IT work (interior design, construction, moving)
- Resumes or "looking for work" posts (someone offering services, not ordering)

"spam" — advertising, promotions, scams, irrelevant marketing

IMPORTANT: Most messages from job channels are full-time VACANCIES, not freelance orders. Be strict — only classify as "job" if there is a clear project-based task that a freelancer could complete through an escrow service.` },
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
      { role: "system", content: `Extract structured job parameters from a freelance project order.

Skills: normalize to standard technology names (e.g., "реакт" → "React", "ноде" → "Node.js", "питон" → "Python", "тайпскрипт" → "TypeScript").

Budget extraction rules:
- Range: "50-100к" → budget_min=50000, budget_max=100000
- Single price: "оплата 25 000 руб" → budget_min=25000, budget_max=25000
- "от 50к" → budget_min=50000, budget_max=null
- "до 100к" → budget_min=null, budget_max=100000
- "$500-1000" → budget_min=500, budget_max=1000
- "оплата по результату", "договорная", "обсуждается" → budget_min=null, budget_max=null
- No budget mentioned at all → budget_min=null, budget_max=null
- NEVER return 0 as a budget value. If you can't determine a budget, use null.

Currency detection:
- Russian text with ₽/руб/р → "RUB"
- Dollar sign $ or "USD" → "USD"
- "TON"/"тон"/"тонкоин" → "TON"
- "USDT"/"тезер" → "USDT"
- Euro €/EUR → "EUR"
- English text without explicit currency → "USD"
- Russian text without explicit currency → "RUB"
- Crypto/Web3 context without explicit currency → "USDT"

Contact: look for @username mentions and t.me/ links.` },
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
        budget_min: params.budget_min || null,
        budget_max: params.budget_max || null,
        currency: params.currency || "USD",
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
      { role: "system", content: "Write a short freelance proposal (3-5 sentences max) for a job posting. Respond in the same language as the job description. Focus only on: why you're a good fit (matching skills), estimated timeline, willingness to discuss details. Don't list repo names. Don't be wordy — busy clients skim proposals. No greetings." },
      { role: "user", content: `Job: ${jobDescription}\nRequired skills: ${jobSkills.join(", ")}\nDeveloper profile: ${profileSummary}` },
    ],
  });

  return res.choices[0]?.message?.content || "Не удалось сгенерировать предложение.";
}
