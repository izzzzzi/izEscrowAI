// SPDX-License-Identifier: AGPL-3.0-only
// This is the public default config. Create prompts.ts (gitignored) for your private prompts.

import type { AIPromptsConfig } from "./types.js";

const config: AIPromptsConfig = {
  systemPrompt: `You are izEscrowAI, a Telegram bot that manages escrow deals on TON blockchain.
Always respond in English.

Your job is to:
1. Classify incoming messages (deal creation, offer creation, question, or action on existing deal)
2. For deal creation (has @username counterparty): extract deal parameters
3. For offer creation (no specific counterparty, public listing): extract offer parameters
4. For questions: provide helpful answers about how the bot works

Key rules:
- "sell/selling/offer" words -> sender is SELLER
- "buy/buying/want to buy" words -> sender is BUYER
- If role is unclear from the message, set sender_role to "unknown" and add "role" to missing_fields
- Currency detection: $ or USD -> "USD", EUR -> "EUR", RUB -> "RUB", TON -> "TON". Default to TON if unclear
- Amounts like "$50", "100 USD", "5000 RUB", "10 TON" should all be parsed correctly
- Always extract @username of counterparty if mentioned
- If critical info is missing, list it in missing_fields
- The user may write in any language -- always parse correctly but respond in English`,

  mediationPrompt: `You are an impartial AI mediator for escrow disputes. Analyze the deal terms and evidence from both parties.
Respond in English.
You must propose a fair split percentage (seller_percent + buyer_percent = 100).
Consider: was the work delivered? partially? does it match the original terms?`,

  parseDealTool: {
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
            description: "Role of the message sender.",
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
            enum: ["TON", "USD", "EUR", "RUB"],
            description: "Currency of the deal amount. Default TON.",
          },
          description: {
            type: "string",
            description: "Brief description of what is being sold/bought.",
          },
          missing_fields: {
            type: "array",
            items: { type: "string" },
            description: "List of required fields that could not be determined.",
          },
        },
        required: ["sender_role", "counterparty_username", "amount", "currency", "description", "missing_fields"],
      },
    },
  },

  classifyMessageTool: {
    type: "function",
    function: {
      name: "classify_message",
      description: "Classify the user message intent.",
      parameters: {
        type: "object",
        properties: {
          intent: {
            type: "string",
            enum: ["deal_creation", "offer_creation", "general_question", "deal_action", "off_platform_payment"],
            description: "The classified intent of the message.",
          },
          answer: {
            type: "string",
            description: "For general_question: helpful answer. For deal_action: description of the action.",
          },
        },
        required: ["intent"],
      },
    },
  },

  parseOfferTool: {
    type: "function",
    function: {
      name: "parse_offer",
      description: "Extract public offer parameters from a message.",
      parameters: {
        type: "object",
        properties: {
          description: {
            type: "string",
            description: "Brief description of the service or task.",
          },
          min_price: {
            type: "number",
            description: "Minimum price or budget. Null if not specified.",
          },
          currency: {
            type: "string",
            enum: ["TON", "USD", "EUR", "RUB"],
            description: "Currency. Default TON.",
          },
          role: {
            type: "string",
            enum: ["seller", "buyer"],
            description: "seller if offering a service, buyer if looking for someone.",
          },
        },
        required: ["description", "currency", "role"],
      },
    },
  },

  parseBidTool: {
    type: "function",
    function: {
      name: "parse_bid",
      description: "Extract price from a bid/application message.",
      parameters: {
        type: "object",
        properties: {
          price: {
            type: "number",
            description: "The bid price offered by the applicant.",
          },
          message: {
            type: "string",
            description: "Optional message or comment from the applicant.",
          },
        },
        required: ["price"],
      },
    },
  },
};

export default config;
