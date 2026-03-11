import { Bot, InlineKeyboard, Context } from "grammy";
import { upsertUser, getUserByUsername, getUserWallet, getReputation, incrementDeals, addRating, updateDealParty, type Deal } from "../db/index.js";
import { classifyAndParse, mediateDispute, type ParsedDeal } from "../ai/index.js";
import {
  createNewDeal,
  confirmDealByCounterparty,
  deployContractForDeal,
  markDealFunded,
  markDelivered,
  completeDeal,
  openDispute,
  resolveDispute,
  cancelDeal,
  getDealById,
  getDealsByUser,
  getDepositPayloadBase64,
  checkFundingStatus,
} from "../deals/index.js";

const MINI_APP_URL = process.env.MINI_APP_URL || "https://localhost:5173";

// Pending deal confirmations (in-memory, keyed by short random ID)
interface PendingDeal { s: string; b: string; a: number; c: string; d: string; }
const pendingDeals = new Map<string, PendingDeal>();
let pendingCounter = 0;

function storePending(data: PendingDeal): string {
  const id = String(++pendingCounter);
  pendingDeals.set(id, data);
  // Auto-cleanup after 10 minutes
  setTimeout(() => pendingDeals.delete(id), 10 * 60 * 1000);
  return id;
}

export function createBot(token: string): Bot {
  const bot = new Bot(token);

  // Global error handler — prevent unhandled crashes
  bot.catch((err) => {
    console.error("Bot error:", err.message);
  });

  // --- Middleware: register user ---
  bot.use(async (ctx, next) => {
    if (ctx.from) {
      upsertUser(ctx.from.id, ctx.from.username);
    }
    await next();
  });

  // --- Commands ---

  bot.command("start", async (ctx) => {
    const payload = ctx.match; // deep link parameter after /start

    // Handle deal deep link: t.me/Bot?start=deal_<id>
    if (payload?.startsWith("deal_")) {
      const dealId = payload.replace("deal_", "");
      const deal = getDealById(dealId);

      if (!deal || deal.status === "cancelled") {
        await ctx.reply("Deal not found or already cancelled.");
        return;
      }

      if (deal.status !== "created") {
        await ctx.reply(
          `Deal #${deal.id} is already in status: ${deal.status}.\n` +
            `Use /mydeals to view details.`,
        );
        return;
      }

      const keyboard = new InlineKeyboard()
        .text("Accept", `confirm_deal:${dealId}`)
        .text("Reject", `reject_deal:${dealId}`);

      await ctx.reply(
        `You've been invited to deal #${deal.id}:\n\n` +
          `Description: ${deal.description}\n` +
          `Amount: ${deal.amount} ${deal.currency}\n\n` +
          `Accept this deal?`,
        { reply_markup: keyboard },
      );
      return;
    }

    await ctx.reply(
      `Welcome to izEscrowAI!\n\n` +
        `I'm an AI-powered escrow agent for safe P2P deals in Telegram. ` +
        `Funds are held by a smart contract on TON, not by the bot.\n\n` +
        `How to create a deal:\n` +
        `Just write something like:\n` +
        `"Selling logo design to @ivan for 50 TON"\n\n` +
        `Commands:\n` +
        `/help — list of commands\n` +
        `/wallet — connect wallet\n` +
        `/mydeals — my deals`,
    );
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(
      `Available commands:\n\n` +
        `/start — get started\n` +
        `/help — this help\n` +
        `/wallet — connect TON wallet via Mini App\n` +
        `/mydeals — your deals list\n\n` +
        `Create a deal:\n` +
        `Write in natural language, for example:\n` +
        `• "Selling website design to @buyer for 100 TON"\n` +
        `• "Want to buy a logo from @designer for 50 TON"\n\n` +
        `The bot will recognize participants, amount, and description, then ask you to confirm.`,
    );
  });

  bot.command("wallet", async (ctx) => {
    const keyboard = new InlineKeyboard().webApp("Connect Wallet", `${MINI_APP_URL}/wallet`);
    await ctx.reply("Connect your TON wallet via Mini App:", { reply_markup: keyboard });
  });

  bot.command("mydeals", async (ctx) => {
    if (!ctx.from) return;
    const deals = getDealsByUser(ctx.from.id);
    if (deals.length === 0) {
      await ctx.reply("You have no deals yet. Create your first one!");
      return;
    }

    const lines = deals.slice(0, 10).map((d) => formatDealShort(d, ctx.from!.id));
    await ctx.reply(`Your deals:\n\n${lines.join("\n\n")}`, { parse_mode: "HTML" });
  });

  // --- Natural language handler ---

  bot.on("message:text", async (ctx) => {
    if (!ctx.from || !ctx.message.text) return;
    const text = ctx.message.text;

    // Skip commands
    if (text.startsWith("/")) return;

    const result = await classifyAndParse(text, ctx.from.username || `id${ctx.from.id}`);

    if (result.type === "general_question") {
      await ctx.reply(result.answer);
      return;
    }

    if (result.type === "deal_action") {
      await ctx.reply(result.details || "Use the buttons in deal messages for actions.");
      return;
    }

    // Deal creation
    const parsed = result.parsed;

    // Check for missing fields
    if (parsed.missing_fields.length > 0) {
      await ctx.reply(
        `Could not recognize all deal parameters.\n` +
          `Missing: ${parsed.missing_fields.join(", ")}\n\n` +
          `Try being more specific, e.g.:\n` +
          `"Selling logo design to @ivan for 50 TON"`,
      );
      return;
    }

    if (!parsed.amount || !parsed.description) {
      await ctx.reply("Could not determine the amount or description. Please try again.");
      return;
    }

    // Show parsed deal for confirmation
    const sellerRep = parsed.seller_username
      ? getReputation(ctx.from.id)
      : { completed_deals: 0, avg_rating: 0 };
    const buyerRep = { completed_deals: 0, avg_rating: 0 };

    const confirmText =
      `Parsed deal:\n\n` +
      `Seller: @${parsed.seller_username || "?"} (${sellerRep.completed_deals} deals, ${sellerRep.avg_rating.toFixed(1)})\n` +
      `Buyer: @${parsed.buyer_username || "?"} (${buyerRep.completed_deals} deals)\n` +
      `Amount: ${parsed.amount} ${parsed.currency}\n` +
      `Description: ${parsed.description}\n\n` +
      `Is this correct?`;

    // Store parsed data in memory with short ID (Telegram callback_data limit: 64 bytes)
    const pendingId = storePending({
      s: parsed.seller_username ?? "",
      b: parsed.buyer_username ?? "",
      a: parsed.amount,
      c: parsed.currency,
      d: parsed.description ?? "",
    });

    const keyboard = new InlineKeyboard()
      .text("Confirm", `cd:${pendingId}`)
      .text("Cancel", "cancel_create");

    await ctx.reply(confirmText, { reply_markup: keyboard });
  });

  // --- Callback handlers ---

  bot.callbackQuery(/^cd:/, async (ctx) => {
    if (!ctx.from || !ctx.callbackQuery.data) return;
    await ctx.answerCallbackQuery();

    try {
      const pendingId = ctx.callbackQuery.data.replace("cd:", "");
      const parsed = pendingDeals.get(pendingId);
      if (!parsed) {
        await ctx.editMessageText("Deal data expired. Please create the deal again.");
        return;
      }
      pendingDeals.delete(pendingId);

      const senderId = ctx.from.id;
      const senderUsername = ctx.from.username || `id${ctx.from.id}`;
      const isSender_seller = parsed.s === senderUsername;
      const counterpartyUsername = isSender_seller ? parsed.b : parsed.s;

      // Look up counterparty in DB
      const counterparty = getUserByUsername(counterpartyUsername);
      const counterpartyId = counterparty?.telegram_id ?? 0;

      const deal = createNewDeal(
        {
          seller_username: parsed.s,
          buyer_username: parsed.b,
          sender_role: isSender_seller ? "seller" : "buyer",
          amount: parsed.a,
          currency: parsed.c,
          description: parsed.d,
          missing_fields: [],
        },
        isSender_seller ? senderId : counterpartyId,
        isSender_seller ? counterpartyId : senderId,
      );

      if (counterparty) {
        // Counterparty is in the bot — send them a direct message
        const keyboard = new InlineKeyboard()
          .text("Accept", `confirm_deal:${deal.id}`)
          .text("Reject", `reject_deal:${deal.id}`);

        try {
          await ctx.api.sendMessage(
            counterparty.telegram_id,
            `New deal #${deal.id} from @${senderUsername}:\n\n` +
              `Description: ${parsed.d}\n` +
              `Amount: ${parsed.a} ${parsed.c}\n\n` +
              `Accept?`,
            { reply_markup: keyboard },
          );
        } catch {
          // counterparty blocked the bot — fall through to deep link
        }

        await ctx.editMessageText(
          `Deal #${deal.id} created!\n\n` +
            `Seller: @${parsed.s}\n` +
            `Buyer: @${parsed.b}\n` +
            `Amount: ${parsed.a} ${parsed.c}\n` +
            `Description: ${parsed.d}\n\n` +
            `Notification sent to @${counterpartyUsername}.`,
        );
      } else {
        // Counterparty not in the bot — generate deep link
        const botUsername = ctx.me.username;
        const deepLink = `https://t.me/${botUsername}?start=deal_${deal.id}`;

        await ctx.editMessageText(
          `Deal #${deal.id} created!\n\n` +
            `Seller: @${parsed.s}\n` +
            `Buyer: @${parsed.b}\n` +
            `Amount: ${parsed.a} ${parsed.c}\n` +
            `Description: ${parsed.d}\n\n` +
            `@${counterpartyUsername} is not in the bot yet.\n` +
            `Share this link:\n${deepLink}`,
        );
      }
    } catch (e) {
      console.error("Deal creation error:", e);
      await ctx.editMessageText("Error creating deal. Please try again.");
    }
  });

  bot.callbackQuery("cancel_create", async (ctx) => {
    await ctx.answerCallbackQuery("Cancelled");
    await ctx.editMessageText("Deal creation cancelled.");
  });

  // Confirm deal by counterparty
  bot.callbackQuery(/^confirm_deal:/, async (ctx) => {
    if (!ctx.from) return;
    await ctx.answerCallbackQuery();

    const dealId = ctx.callbackQuery.data?.replace("confirm_deal:", "");
    if (!dealId) return;

    // Update counterparty ID if it was 0 (arrived via deep link)
    const dealBefore = getDealById(dealId);
    if (dealBefore) {
      if (dealBefore.buyer_id === 0) {
        updateDealParty(dealId, "buyer_id", ctx.from.id);
      } else if (dealBefore.seller_id === 0) {
        updateDealParty(dealId, "seller_id", ctx.from.id);
      }
    }

    const deal = confirmDealByCounterparty(dealId);
    if (!deal) {
      await ctx.editMessageText("Could not confirm the deal.");
      return;
    }

    // Check if buyer has wallet
    const buyerWallet = getUserWallet(deal.buyer_id);
    const sellerWallet = getUserWallet(deal.seller_id);

    if (!buyerWallet || !sellerWallet) {
      const keyboard = new InlineKeyboard().webApp("Connect Wallet", `${MINI_APP_URL}/wallet`);
      await ctx.editMessageText(
        `Deal #${dealId} confirmed!\n\n` +
          `Both parties need to connect a TON wallet to proceed.`,
        { reply_markup: keyboard },
      );
      return;
    }

    // Deploy contract
    try {
      const result = await deployContractForDeal(dealId, buyerWallet, sellerWallet);
      if (!result) {
        await ctx.editMessageText("Error deploying contract.");
        return;
      }

      const payKeyboard = new InlineKeyboard().webApp(
        "Pay via Mini App",
        `${MINI_APP_URL}/pay/${dealId}`,
      );

      await ctx.editMessageText(
        `Deal #${dealId} confirmed!\n` +
          `Contract: ${result.contractAddress}\n\n` +
          `Buyer, please pay:`,
        { reply_markup: payKeyboard },
      );
    } catch {
      await ctx.editMessageText("Error deploying contract. Please try later.");
    }
  });

  // Reject deal
  bot.callbackQuery(/^reject_deal:/, async (ctx) => {
    const dealId = ctx.callbackQuery.data?.replace("reject_deal:", "");
    if (!dealId) return;
    await ctx.answerCallbackQuery("Deal rejected");
    cancelDeal(dealId);
    await ctx.editMessageText(`Deal #${dealId} rejected.`);
  });

  // Mark delivered
  bot.callbackQuery(/^delivered:/, async (ctx) => {
    const dealId = ctx.callbackQuery.data?.replace("delivered:", "");
    if (!dealId) return;
    await ctx.answerCallbackQuery();

    const deal = markDelivered(dealId);
    if (!deal) {
      await ctx.editMessageText("Could not mark as delivered.");
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("Confirm Receipt", `confirm_delivery:${dealId}`)
      .text("Open Dispute", `dispute:${dealId}`);

    await ctx.editMessageText(
      `Deal #${dealId}: seller marked as delivered.\n\n` +
        `Buyer has 7 days to confirm or open a dispute.`,
      { reply_markup: keyboard },
    );
  });

  // Confirm delivery
  bot.callbackQuery(/^confirm_delivery:/, async (ctx) => {
    const dealId = ctx.callbackQuery.data?.replace("confirm_delivery:", "");
    if (!dealId) return;
    await ctx.answerCallbackQuery();

    try {
      const deal = await completeDeal(dealId);
      if (!deal) {
        await ctx.editMessageText("Could not complete the deal.");
        return;
      }

      // Update reputation
      incrementDeals(deal.seller_id);
      incrementDeals(deal.buyer_id);

      const ratingKeyboard = new InlineKeyboard()
        .text("1", `rate:${dealId}:1`)
        .text("2", `rate:${dealId}:2`)
        .text("3", `rate:${dealId}:3`)
        .text("4", `rate:${dealId}:4`)
        .text("5", `rate:${dealId}:5`);

      await ctx.editMessageText(
        `Deal #${dealId} completed!\n` +
          `Funds sent to seller.\n\n` +
          `Rate this deal:`,
        { reply_markup: ratingKeyboard },
      );
    } catch {
      await ctx.editMessageText("Error completing the deal. Please try later.");
    }
  });

  // Rate deal
  bot.callbackQuery(/^rate:/, async (ctx) => {
    const parts = ctx.callbackQuery.data?.split(":");
    if (!parts || parts.length !== 3) return;
    await ctx.answerCallbackQuery("Thanks for your rating!");

    const dealId = parts[1];
    const rating = parseInt(parts[2]);
    const deal = getDealById(dealId);
    if (deal) {
      addRating(deal.seller_id, rating);
    }

    await ctx.editMessageText(
      `Deal #${dealId} completed! Rating: ${"⭐".repeat(rating)}`,
    );
  });

  // Open dispute
  bot.callbackQuery(/^dispute:/, async (ctx) => {
    const dealId = ctx.callbackQuery.data?.replace("dispute:", "");
    if (!dealId) return;
    await ctx.answerCallbackQuery();

    const deal = openDispute(dealId);
    if (!deal) {
      await ctx.editMessageText("Could not open dispute.");
      return;
    }

    await ctx.editMessageText(
      `Deal #${dealId}: dispute opened.\n\n` +
        `AI will analyze the situation and propose a resolution.`,
    );

    // AI mediation will be triggered when user sends dispute reason
    // For MVP: immediate mediation with available info
    try {
      const resolution = await mediateDispute(
        deal.description,
        deal.amount,
        deal.currency,
        "Buyer is not satisfied with the result",
        "",
        "",
      );

      const keyboard = new InlineKeyboard()
        .text("Accept", `accept_resolution:${dealId}:${resolution.seller_percent}`)
        .text("Reject", `reject_resolution:${dealId}`);

      await ctx.reply(
        `AI Mediation for deal #${dealId}:\n\n` +
          `${resolution.explanation}\n\n` +
          `Proposed split:\n` +
          `Seller: ${resolution.seller_percent}% (${((deal.amount * resolution.seller_percent) / 100).toFixed(2)} ${deal.currency})\n` +
          `Buyer: ${resolution.buyer_percent}% (${((deal.amount * resolution.buyer_percent) / 100).toFixed(2)} ${deal.currency})\n\n` +
          `Both parties must accept the resolution.`,
        { reply_markup: keyboard },
      );
    } catch {
      await ctx.reply("AI mediation error. Please try later.");
    }
  });

  // Accept resolution
  bot.callbackQuery(/^accept_resolution:/, async (ctx) => {
    const parts = ctx.callbackQuery.data?.split(":");
    if (!parts || parts.length !== 3) return;
    await ctx.answerCallbackQuery("Resolution accepted");

    const dealId = parts[1];
    const sellerPercent = parseInt(parts[2]);

    // For MVP: resolve immediately when one side accepts
    // In production: track both acceptances
    try {
      const deal = await resolveDispute(dealId, sellerPercent);
      if (deal) {
        incrementDeals(deal.seller_id);
        incrementDeals(deal.buyer_id);
        await ctx.editMessageText(
          `Deal #${dealId} resolved.\n` +
            `Funds split: ${sellerPercent}% to seller, ${100 - sellerPercent}% to buyer.`,
        );
      }
    } catch {
      await ctx.editMessageText("Error executing resolution.");
    }
  });

  bot.callbackQuery(/^reject_resolution:/, async (ctx) => {
    await ctx.answerCallbackQuery("Resolution rejected");
    await ctx.editMessageText(
      "AI resolution rejected. Contact the other party to discuss.",
    );
  });

  return bot;
}

// --- Formatting helpers ---

function formatDealShort(deal: Deal, userId: number): string {
  const role = deal.seller_id === userId ? "Seller" : "Buyer";
  const statusEmoji: Record<string, string> = {
    created: "📋",
    confirmed: "✅",
    funded: "💰",
    delivered: "📦",
    completed: "✅",
    disputed: "⚠️",
    resolved: "⚖️",
    expired: "⏰",
    cancelled: "❌",
  };

  return (
    `${statusEmoji[deal.status] || "❓"} <b>#${deal.id}</b> — ${deal.status}\n` +
    `${role} | ${deal.amount} ${deal.currency}\n` +
    `${deal.description}`
  );
}
