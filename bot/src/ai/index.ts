import OpenAI from "openai";

const MODEL = "openai/gpt-4.1-nano";

let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: process.env.OPENROUTER_API_KEY,
    });
  }
  return _client;
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

export type MessageIntent =
  | { type: "deal_creation"; parsed: ParsedDeal }
  | { type: "general_question"; answer: string }
  | { type: "deal_action"; action: string; details: string };

export interface DisputeResolution {
  seller_percent: number;
  buyer_percent: number;
  explanation: string;
}

// --- Tool definitions (OpenAI format) ---

const parseDealTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "parse_deal",
    description:
      "Extract deal parameters from a user message. Call this when the user wants to create a new escrow deal.",
    parameters: {
      type: "object",
      properties: {
        sender_role: {
          type: "string",
          enum: ["seller", "buyer", "unknown"],
          description:
            'Role of the message sender. "seller" if they use words like "продаю/sell/предлагаю", "buyer" if "покупаю/buy/хочу купить", "unknown" if unclear.',
        },
        counterparty_username: {
          type: "string",
          description: "Telegram @username of the other party (without @). Null if not specified.",
        },
        amount: {
          type: "number",
          description: "Deal amount. Null if not specified.",
        },
        currency: {
          type: "string",
          description: 'Currency: "TON" or "USDT". Default "TON" if not specified.',
        },
        description: {
          type: "string",
          description: "Brief description of what is being sold/bought. Null if not clear.",
        },
        missing_fields: {
          type: "array",
          items: { type: "string" },
          description: "List of required fields that could not be determined from the message.",
        },
      },
      required: [
        "sender_role",
        "counterparty_username",
        "amount",
        "currency",
        "description",
        "missing_fields",
      ],
    },
  },
};

const classifyMessageTool: OpenAI.ChatCompletionTool = {
  type: "function",
  function: {
    name: "classify_message",
    description: "Classify the user message intent: deal creation, general question, or deal action.",
    parameters: {
      type: "object",
      properties: {
        intent: {
          type: "string",
          enum: ["deal_creation", "general_question", "deal_action"],
          description:
            '"deal_creation" if user wants to create/propose a deal, "general_question" for help/info requests, "deal_action" for actions on existing deals.',
        },
        answer: {
          type: "string",
          description: "For general_question: helpful answer. For deal_action: description of the action.",
        },
      },
      required: ["intent"],
    },
  },
};

const SYSTEM_PROMPT = `You are izEscrowAI, a Telegram bot that manages escrow deals on TON blockchain.
Always respond in English.

Your job is to:
1. Classify incoming messages (deal creation, question, or action on existing deal)
2. For deal creation: extract parameters (who sells, who buys, amount, currency, description)
3. For questions: provide helpful answers about how the bot works

Key rules:
- "продаю/sell/предлагаю/selling" → sender is SELLER
- "покупаю/buy/хочу купить/buying/want to buy" → sender is BUYER
- If role is unclear from the message, set sender_role to "unknown" and add "role" to missing_fields
- Currency defaults to TON unless user says USDT/dollars
- Always extract @username of counterparty if mentioned
- If critical info is missing, list it in missing_fields
- The user may write in any language — always parse correctly but respond in English`;

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
  const response = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Message from @${senderUsername}: "${userMessage}"` },
    ],
    tools: [classifyMessageTool, parseDealTool],
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

        if (args.intent === "deal_action") {
          return { type: "deal_action", action: args.intent, details: args.answer ?? "" };
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
  const response = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Parse this deal message from @${senderUsername}: "${userMessage}"` },
    ],
    tools: [parseDealTool],
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

// --- Dispute Mediation ---

export async function mediateDispute(
  dealDescription: string,
  dealAmount: number,
  dealCurrency: string,
  disputeReason: string,
  sellerEvidence: string,
  buyerEvidence: string,
): Promise<DisputeResolution> {
  const response = await getClient().chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "system",
        content: `You are an impartial AI mediator for escrow disputes. Analyze the deal terms and evidence from both parties.
Respond in English.
You must propose a fair split percentage (seller_percent + buyer_percent = 100).
Consider: was the work delivered? partially? does it match the original terms?`,
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
