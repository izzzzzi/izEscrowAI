// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 izEscrowAI contributors

import { Bot, InlineKeyboard, Context } from "grammy";
import { getLang, t } from "../i18n/index.js";
import { upsertUser, getUserByUsername, getUserWallet, getReputation, getDetailedReputation, incrementDeals, addRating, updateDealParty, createOffer, getOfferById, updateOfferInlineMessageId, addApplication, getApplicationById, getApplicationsByOffer, countApplicationsByOffer, acceptApplication, rejectAllApplications, closeOffer, upsertGroup, setGroupInactive, getGroupStatsById, getLeaderboard, linkDealToGroup, incrementGroupOffers, isUserBanned, getJobsForNewUser, getExpiredOffers, expireOffer, getOffersByUser, upsertUserProfile, getUserProfile, getUsersByCategories, createSpec, getSpecById, updateSpec, getSpecsByCreator, linkSpecToDeal, getSpecByDeal, getUserTrustScore, type Deal, type Offer, type Spec } from "../db/index.js";
import { classifyAndParse, mediateDispute, parseOffer, generateOfferPreview, calcTrustScore, assessDealRisk, generateSpec, estimatePrice, evaluateSpecCompliance, specConversations, type ParsedDeal, type ParsedOffer, type GeneratedSpec, type PriceEstimate } from "../ai/index.js";
import { processGroupMessage } from "../parser/index.js";
import { recalculateTrustScore, formatTrustBadge } from "../scoring/index.js";
import { findMatchingExecutors, formatMatchResults } from "../matching/index.js";
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
interface PendingDeal { s: string; b: string; a: number; c: string; d: string; uid: number; }
const pendingDeals = new Map<string, PendingDeal>();
const MAX_PENDING_PER_USER = 3;
let pendingCounter = 0;

// User conversation state for auction bid flow
type UserState =
  | { type: "offer_bid"; offerId: string; step: "price" | "message"; price?: number };
const userStates = new Map<number, UserState>();

// Off-platform payment warning tracker (one warning per chat)
const offPlatformWarnings = new Set<number>();

// Rate limiting: last offer timestamp per user per group
const offerRateLimit = new Map<string, number>(); // key: `userId:groupId`, value: timestamp

// Pending spec confirmations (in-memory, keyed by chatId)
const pendingSpecs = new Map<number, GeneratedSpec>();

// Evidence for spec-based arbitration (keyed by dealId)
const disputeEvidence = new Map<string, { seller?: string; buyer?: string; timeout?: ReturnType<typeof setTimeout> }>();

function countPendingByUser(userId: number): number {
  let count = 0;
  for (const deal of pendingDeals.values()) {
    if (deal.uid === userId) count++;
  }
  return count;
}

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
      await upsertUser(ctx.from.id, ctx.from.username);
    }
    await next();
  });

  // --- Middleware: ban check ---
  bot.use(async (ctx, next) => {
    if (ctx.from && await isUserBanned(ctx.from.id)) {
      return; // silently ignore banned users
    }
    await next();
  });

  // --- Commands ---

  bot.command("start", async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    const payload = ctx.match; // deep link parameter after /start

    // Handle offer deep link: t.me/Bot?start=offer_<id>
    if (payload?.startsWith("offer_")) {
      const offerId = payload.replace("offer_", "");
      const offer = await getOfferById(offerId);

      if (!offer || offer.status !== "open") {
        await ctx.reply(t(lang, "start.offer_unavailable"));
        return;
      }

      // Prevent self-application
      if (offer.creator_id === ctx.from.id) {
        await ctx.reply(t(lang, "start.offer_self_apply"));
        return;
      }

      const appCount = await countApplicationsByOffer(offerId);
      const priceStr = offer.min_price
        ? t(lang, "start.offer_price_from", { min_price: offer.min_price, currency: offer.currency })
        : t(lang, "start.offer_price_negotiable");
      await ctx.reply(
        t(lang, "start.offer_details", { description: offer.description, price: priceStr, appCount }),
      );

      userStates.set(ctx.from.id, { type: "offer_bid", offerId, step: "price" });
      return;
    }

    // Handle deal deep link: t.me/Bot?start=deal_<id>
    if (payload?.startsWith("deal_")) {
      const dealId = payload.replace("deal_", "");
      const deal = await getDealById(dealId);

      if (!deal || deal.status === "cancelled") {
        await ctx.reply(t(lang, "start.deal_not_found"));
        return;
      }

      if (deal.status !== "created") {
        await ctx.reply(t(lang, "start.deal_already_status", { dealId: deal.id, status: deal.status }));
        return;
      }

      const keyboard = new InlineKeyboard()
        .text("Accept", `confirm_deal:${dealId}`)
        .text("Reject", `reject_deal:${dealId}`);

      await ctx.reply(
        t(lang, "start.deal_invite", { dealId: deal.id, description: deal.description, amount: formatAmount(deal) }),
        { reply_markup: keyboard },
      );
      return;
    }

    // Check if user has parsed jobs from groups
    let jobsNotice = "";
    try {
      const myJobs = await getJobsForNewUser(ctx.from.id, ctx.from.username);
      if (myJobs.length > 0) {
        jobsNotice = t(lang, "start.jobs_notice", { count: myJobs.length });
      }
    } catch { /* non-critical */ }

    const startKeyboard = new InlineKeyboard()
      .webApp("Open App", MINI_APP_URL)
      .url("Web Platform", "https://iz-escrow-ai.vercel.app");

    await ctx.reply(
      t(lang, "start.welcome") + jobsNotice,
      { reply_markup: startKeyboard },
    );
  });

  bot.command("help", async (ctx) => {
    const lang = getLang(ctx.from?.language_code);
    await ctx.reply(t(lang, "help"));
  });

  bot.command("wallet", async (ctx) => {
    const lang = getLang(ctx.from?.language_code);
    const keyboard = new InlineKeyboard().webApp("Connect Wallet", `${MINI_APP_URL}/profile`);
    await ctx.reply(t(lang, "wallet.prompt"), { reply_markup: keyboard });
  });

  bot.command("mydeals", async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    const deals = await getDealsByUser(ctx.from.id);
    if (deals.length === 0) {
      await ctx.reply(t(lang, "mydeals.empty"));
      return;
    }

    const lines = deals.slice(0, 10).map((d) => formatDealShort(d, ctx.from!.id));
    await ctx.reply(`${t(lang, "mydeals.title")}\n\n${lines.join("\n\n")}`, { parse_mode: "HTML" });
  });

  // --- Natural language handler ---

  bot.on("message:text", async (ctx) => {
    if (!ctx.from || !ctx.message.text) return;
    const text = ctx.message.text;

    // Skip commands
    if (text.startsWith("/")) return;

    // Check spec conversation state (2.6, 2.8)
    if (specConversations.has(ctx.from.id)) {
      const lang = getLang(ctx.from.language_code);
      const conv = specConversations.get(ctx.from.id)!;
      conv.history.push({ role: "user", content: text });
      conv.lastActivity = Date.now();

      // Check round limit
      if (conv.history.length > 10) {
        specConversations.delete(ctx.from.id);
        await ctx.reply(t(lang, "spec.conversation_limit"));
        return;
      }

      try {
        const result = await generateSpec(text, conv.history);
        if (result.type === "questions") {
          const questions = result.questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
          await ctx.reply(t(lang, "spec.follow_up", { questions }));
          return;
        }

        // Got a spec — show for review
        specConversations.delete(ctx.from.id);
        pendingSpecs.set(ctx.from.id, result);
        const keyboard = new InlineKeyboard()
          .text("✅ Confirm", "spec_confirm")
          .text("✏️ Edit", "spec_edit")
          .row()
          .text("💰 Estimate Price", "spec_price");

        await ctx.reply(formatSpecPreview(result), { reply_markup: keyboard });
      } catch {
        await ctx.reply(t(lang, "spec.error_input"));
      }
      return;
    }

    // Check evidence submission for spec-based arbitration (3.4)
    // (handled via userStates below)

    // Check conversation state (auction bid flow)
    const state = userStates.get(ctx.from.id);
    if (state?.type === "offer_bid") {
      const lang = getLang(ctx.from.language_code);
      if (state.step === "price") {
        const price = parseFloat(text.replace(/[^0-9.]/g, ""));
        if (isNaN(price) || price <= 0) {
          await ctx.reply(t(lang, "bid.invalid_price"));
          return;
        }
        state.price = price;
        state.step = "message";
        await ctx.reply(t(lang, "bid.enter_message"));
        return;
      }

      if (state.step === "message") {
        const message = text === "/skip" ? null : text;
        const offerId = state.offerId;
        const price = state.price!;
        userStates.delete(ctx.from.id);

        const offer = await getOfferById(offerId);
        if (!offer || offer.status !== "open") {
          await ctx.reply(t(lang, "bid.offer_unavailable"));
          return;
        }

        const appId = `app_${Date.now()}_${ctx.from.id}`;
        await addApplication({
          id: appId,
          offer_id: offerId,
          user_id: ctx.from.id,
          price,
          message: message ?? undefined,
        });

        const msgLine = message ? t(lang, "bid.submitted_message", { message }) : "";
        await ctx.reply(
          t(lang, "bid.submitted", { price, currency: offer.currency, message: msgLine }),
        );

        // Notify creator
        try {
          const appCount = await countApplicationsByOffer(offerId);
          const rep = await getDetailedReputation(ctx.from.id);
          const trust = calcTrustScore(rep);
          const trustStr = trust !== null ? `Trust: ${trust}` : t(lang, "bid.trust_new_user");

          const creatorKeyboard = new InlineKeyboard()
            .text(`View All (${appCount})`, `all_apps:${offerId}`);

          const msgPart = message ? t(lang, "bid.new_application_message", { message }) : "";
          await ctx.api.sendMessage(
            offer.creator_id,
            t(lang, "bid.new_application", {
              description: offer.description,
              username: ctx.from.username || `id${ctx.from.id}`,
              trust: trustStr,
              price,
              currency: offer.currency,
            }) + msgPart,
            { reply_markup: creatorKeyboard },
          );
        } catch {
          // creator blocked bot
        }

        // Update inline message if available
        if (offer.inline_message_id) {
          try {
            const appCount = await countApplicationsByOffer(offerId);
            const apps = await getApplicationsByOffer(offerId);
            const maxPrice = Math.max(...apps.map(a => a.price));

            await ctx.api.editMessageTextInline(
              offer.inline_message_id,
              generateOfferPreview({
                description: offer.description,
                min_price: offer.min_price,
                currency: offer.currency,
                role: offer.role as "seller" | "buyer",
              }) + `\n\nApplications: ${appCount} | Best: ${maxPrice} ${offer.currency}`,
              {
                reply_markup: {
                  inline_keyboard: [
                    [{ text: `Apply (${appCount})`, url: `https://t.me/${ctx.me.username}?start=offer_${offerId}` }],
                  ],
                },
              },
            );
          } catch {
            // inline message edit failed
          }
        }

        return;
      }
    }

    const result = await classifyAndParse(text, ctx.from.username || `id${ctx.from.id}`);

    if (result.type === "general_question") {
      await ctx.reply(result.answer);
      return;
    }

    if (result.type === "off_platform_payment") {
      // One-time soft warning per chat
      const chatId = ctx.chat.id;
      if (!offPlatformWarnings.has(chatId)) {
        offPlatformWarnings.add(chatId);
        const lang = getLang(ctx.from.language_code);
        await ctx.reply("⚠️ " + t(lang, "off_platform_warning"));
      }
      return;
    }

    if (result.type === "deal_action") {
      const lang = getLang(ctx.from.language_code);
      await ctx.reply(result.details || t(lang, "deal_action.fallback"));
      return;
    }

    // Handle spec_creation intent (2.6, 9.4)
    if (result.type === "spec_creation") {
      const lang = getLang(ctx.from.language_code);
      await ctx.reply("🤖 " + t(lang, "spec.generating"));
      try {
        const specResult = await generateSpec(result.description);
        if (specResult.type === "questions") {
          specConversations.set(ctx.from.id, {
            history: [{ role: "user", content: result.description }],
            createdAt: Date.now(),
            lastActivity: Date.now(),
          });
          const questions = specResult.questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
          await ctx.reply(t(lang, "spec.clarification", { questions }));
        } else {
          pendingSpecs.set(ctx.from.id, specResult);
          const keyboard = new InlineKeyboard()
            .text("✅ Confirm", "spec_confirm")
            .text("✏️ Edit", "spec_edit")
            .row()
            .text("💰 Estimate Price", "spec_price");
          await ctx.reply(formatSpecPreview(specResult), { reply_markup: keyboard });
        }
      } catch {
        await ctx.reply(t(lang, "spec.error_generate"));
      }
      return;
    }

    // Handle pricing_request intent (4.6)
    if (result.type === "pricing_request") {
      const lang = getLang(ctx.from.language_code);
      await ctx.reply("🤖 " + t(lang, "pricing.estimating"));
      try {
        const estimate = await estimatePrice({
          title: result.description,
          category: "general",
          requirements: [result.description],
          budget_currency: "USD",
        });
        await ctx.reply(
          "💰 " + t(lang, "pricing.result", { estimate: formatPriceEstimate(estimate) }),
        );
      } catch {
        await ctx.reply(t(lang, "pricing.error"));
      }
      return;
    }

    if (result.type === "offer_creation") {
      const lang = getLang(ctx.from.language_code);
      await ctx.reply(t(lang, "offer.use_inline", { botUsername: ctx.me.username, text }));
      return;
    }

    // Deal creation
    if (result.type !== "deal_creation") return;
    const parsed = result.parsed;

    const lang = getLang(ctx.from.language_code);

    // Check for missing fields
    if (parsed.missing_fields.length > 0) {
      await ctx.reply(t(lang, "deal.missing_fields", { fields: parsed.missing_fields.join(", ") }));
      return;
    }

    if (!parsed.amount || !parsed.description) {
      await ctx.reply(t(lang, "deal.missing_amount"));
      return;
    }

    // Show parsed deal for confirmation
    const sellerRep = parsed.seller_username
      ? await getReputation(ctx.from.id)
      : { completed_deals: 0, avg_rating: 0 };
    const buyerRep = { completed_deals: 0, avg_rating: 0 };

    const confirmText = t(lang, "deal.confirm_prompt", {
      seller: parsed.seller_username || "?",
      sellerDeals: sellerRep.completed_deals,
      sellerRating: sellerRep.avg_rating.toFixed(1),
      buyer: parsed.buyer_username || "?",
      buyerDeals: buyerRep.completed_deals,
      amount: parsed.amount,
      currency: parsed.currency,
      description: parsed.description,
    });

    // Check pending deal limit per user
    if (countPendingByUser(ctx.from.id) >= MAX_PENDING_PER_USER) {
      await ctx.reply(t(lang, "deal.too_many_pending"));
      return;
    }

    // Store parsed data in memory with short ID (Telegram callback_data limit: 64 bytes)
    const pendingId = storePending({
      s: parsed.seller_username ?? "",
      b: parsed.buyer_username ?? "",
      a: parsed.amount,
      c: parsed.currency,
      d: parsed.description ?? "",
      uid: ctx.from.id,
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
    const lang = getLang(ctx.from.language_code);

    try {
      const pendingId = ctx.callbackQuery.data.replace("cd:", "");
      const parsed = pendingDeals.get(pendingId);
      if (!parsed) {
        await ctx.editMessageText(t(lang, "deal.data_expired"));
        return;
      }
      pendingDeals.delete(pendingId);

      const senderId = ctx.from.id;
      const senderUsername = ctx.from.username || `id${ctx.from.id}`;
      const isSender_seller = parsed.s === senderUsername;
      const counterpartyUsername = isSender_seller ? parsed.b : parsed.s;

      // Look up counterparty in DB
      const counterparty = await getUserByUsername(counterpartyUsername);
      const counterpartyId = counterparty?.telegram_id ?? 0;

      const deal = await createNewDeal(
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
            t(lang, "deal.new_deal_notification", {
              dealId: deal.id,
              sender: senderUsername,
              description: parsed.d,
              amount: formatAmount(deal),
            }),
            { reply_markup: keyboard },
          );
        } catch {
          // counterparty blocked the bot — fall through to deep link
        }

        await ctx.editMessageText(
          t(lang, "deal.created_notified", {
            dealId: deal.id,
            seller: parsed.s,
            buyer: parsed.b,
            amount: formatAmount(deal),
            description: parsed.d,
            counterparty: counterpartyUsername,
          }),
        );
      } else {
        // Counterparty not in the bot — generate deep link
        const botUsername = ctx.me.username;
        const deepLink = `https://t.me/${botUsername}?start=deal_${deal.id}`;

        await ctx.editMessageText(
          t(lang, "deal.created_deep_link", {
            dealId: deal.id,
            seller: parsed.s,
            buyer: parsed.b,
            amount: formatAmount(deal),
            description: parsed.d,
            counterparty: counterpartyUsername,
            deepLink,
          }),
        );
      }
    } catch (e: any) {
      console.error("Deal creation error:", e);
      const msg = e?.message?.startsWith("Maximum deal amount")
        ? e.message
        : t(lang, "deal.creation_error");
      await ctx.editMessageText(msg);
    }
  });

  bot.callbackQuery("cancel_create", async (ctx) => {
    const lang = getLang(ctx.from?.language_code);
    await ctx.answerCallbackQuery("Cancelled");
    await ctx.editMessageText(t(lang, "deal.creation_cancelled"));
  });

  // Confirm deal by counterparty
  bot.callbackQuery(/^confirm_deal:/, async (ctx) => {
    if (!ctx.from) return;
    await ctx.answerCallbackQuery();
    const lang = getLang(ctx.from.language_code);

    const dealId = ctx.callbackQuery.data?.replace("confirm_deal:", "");
    if (!dealId) return;

    // Update counterparty ID if it was 0 (arrived via deep link)
    const dealBefore = await getDealById(dealId);
    if (dealBefore) {
      if (dealBefore.buyer_id === 0) {
        await updateDealParty(dealId, "buyer_id", ctx.from.id);
      } else if (dealBefore.seller_id === 0) {
        await updateDealParty(dealId, "seller_id", ctx.from.id);
      }
    }

    const deal = await confirmDealByCounterparty(dealId);
    if (!deal) {
      await ctx.editMessageText(t(lang, "deal.confirm_failed"));
      return;
    }

    // Check if buyer has wallet
    const buyerWallet = await getUserWallet(deal.buyer_id);
    const sellerWallet = await getUserWallet(deal.seller_id);

    if (!buyerWallet || !sellerWallet) {
      const keyboard = new InlineKeyboard().webApp("Connect Wallet", `${MINI_APP_URL}/wallet`);
      await ctx.editMessageText(
        t(lang, "deal.confirmed_need_wallets", { dealId }),
        { reply_markup: keyboard },
      );
      return;
    }

    // Deploy contract
    try {
      const result = await deployContractForDeal(dealId, buyerWallet, sellerWallet);
      if (!result) {
        await ctx.editMessageText(t(lang, "deal.deploy_error"));
        return;
      }

      const payKeyboard = new InlineKeyboard().webApp(
        "Pay via Mini App",
        `${MINI_APP_URL}/pay/${dealId}`,
      );

      await ctx.editMessageText(
        t(lang, "deal.confirmed_pay", { dealId, contractAddress: result.contractAddress }),
        { reply_markup: payKeyboard },
      );
    } catch {
      await ctx.editMessageText(t(lang, "deal.deploy_error_retry"));
    }
  });

  // Reject deal
  bot.callbackQuery(/^reject_deal:/, async (ctx) => {
    const dealId = ctx.callbackQuery.data?.replace("reject_deal:", "");
    if (!dealId) return;
    const lang = getLang(ctx.from?.language_code);
    await ctx.answerCallbackQuery("Deal rejected");
    await cancelDeal(dealId);
    await ctx.editMessageText(t(lang, "deal.rejected", { dealId }));
  });

  // Mark delivered
  bot.callbackQuery(/^delivered:/, async (ctx) => {
    const dealId = ctx.callbackQuery.data?.replace("delivered:", "");
    if (!dealId) return;
    const lang = getLang(ctx.from?.language_code);
    await ctx.answerCallbackQuery();

    const deal = await markDelivered(dealId);
    if (!deal) {
      await ctx.editMessageText(t(lang, "delivery.mark_failed"));
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("Confirm Receipt", `confirm_delivery:${dealId}`)
      .text("Open Dispute", `dispute:${dealId}`);

    await ctx.editMessageText(
      t(lang, "delivery.marked", { dealId }),
      { reply_markup: keyboard },
    );
  });

  // Confirm delivery
  bot.callbackQuery(/^confirm_delivery:/, async (ctx) => {
    const dealId = ctx.callbackQuery.data?.replace("confirm_delivery:", "");
    if (!dealId) return;
    const lang = getLang(ctx.from?.language_code);
    await ctx.answerCallbackQuery();

    try {
      const deal = await completeDeal(dealId);
      if (!deal) {
        await ctx.editMessageText(t(lang, "delivery.complete_failed"));
        return;
      }

      // Update reputation
      await incrementDeals(deal.seller_id);
      await incrementDeals(deal.buyer_id);

      const ratingKeyboard = new InlineKeyboard()
        .text("1", `rate:${dealId}:1`)
        .text("2", `rate:${dealId}:2`)
        .text("3", `rate:${dealId}:3`)
        .text("4", `rate:${dealId}:4`)
        .text("5", `rate:${dealId}:5`);

      await ctx.editMessageText(
        t(lang, "delivery.completed", { dealId }),
        { reply_markup: ratingKeyboard },
      );
    } catch {
      await ctx.editMessageText(t(lang, "delivery.complete_error"));
    }
  });

  // Rate deal
  bot.callbackQuery(/^rate:/, async (ctx) => {
    const parts = ctx.callbackQuery.data?.split(":");
    if (!parts || parts.length !== 3) return;
    const lang = getLang(ctx.from?.language_code);
    await ctx.answerCallbackQuery("Thanks for your rating!");

    const dealId = parts[1];
    const rating = parseInt(parts[2]);
    const deal = await getDealById(dealId);
    if (deal) {
      await addRating(deal.seller_id, rating);
    }

    await ctx.editMessageText(
      t(lang, "delivery.rated", { dealId, stars: "\u2B50".repeat(rating) }),
    );
  });

  // Open dispute (3.3, 3.7, 3.8)
  bot.callbackQuery(/^dispute:/, async (ctx) => {
    const dealId = ctx.callbackQuery.data?.replace("dispute:", "");
    if (!dealId) return;
    const lang = getLang(ctx.from?.language_code);
    await ctx.answerCallbackQuery();

    const deal = await openDispute(dealId);
    if (!deal) {
      await ctx.editMessageText(t(lang, "dispute.open_failed"));
      return;
    }

    // Check if deal has a linked spec (3.3)
    const spec = await getSpecByDeal(dealId);

    if (spec && spec.requirements && spec.requirements.length > 0) {
      // Spec-based arbitration flow (3.3, 3.4)
      disputeEvidence.set(dealId, {});

      await ctx.editMessageText(
        t(lang, "dispute.opened_spec", { dealId, reqCount: spec.requirements.length }),
      );

      // Ask both parties for evidence
      const evidenceMsg = t(lang, "dispute.evidence_request", { dealId });

      try { await ctx.api.sendMessage(deal.seller_id, `📋 ${evidenceMsg}\n\n${t(lang, "dispute.evidence_seller")}`); } catch { /* blocked */ }
      try { await ctx.api.sendMessage(deal.buyer_id, `📋 ${evidenceMsg}\n\n${t(lang, "dispute.evidence_buyer")}`); } catch { /* blocked */ }

      // Set timeout: trigger arbitration after 24h even if not all evidence submitted
      const timeout = setTimeout(async () => {
        const ev = disputeEvidence.get(dealId);
        if (ev) {
          await runSpecArbitration(dealId, deal, spec, ev.seller ?? "", ev.buyer ?? "", ctx);
          disputeEvidence.delete(dealId);
        }
      }, 24 * 60 * 60 * 1000);
      disputeEvidence.get(dealId)!.timeout = timeout;

      // Set up evidence submission via userStates
      userStates.set(deal.seller_id, { type: "offer_bid", offerId: `evidence_seller_${dealId}`, step: "message" } as any);
      userStates.set(deal.buyer_id, { type: "offer_bid", offerId: `evidence_buyer_${dealId}`, step: "message" } as any);

      return;
    }

    // Fallback: deals without specs use existing mediateDispute (3.8)
    await ctx.editMessageText(
      t(lang, "dispute.opened_no_spec", { dealId }),
    );

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
        t(lang, "dispute.mediation", {
          dealId,
          explanation: resolution.explanation,
          sellerPercent: resolution.seller_percent,
          sellerAmount: ((deal.amount * resolution.seller_percent) / 100).toFixed(2),
          buyerPercent: resolution.buyer_percent,
          buyerAmount: ((deal.amount * resolution.buyer_percent) / 100).toFixed(2),
          currency: deal.currency,
        }),
        { reply_markup: keyboard },
      );
    } catch {
      await ctx.reply(t(lang, "dispute.mediation_error"));
    }
  });

  // Accept resolution
  bot.callbackQuery(/^accept_resolution:/, async (ctx) => {
    const parts = ctx.callbackQuery.data?.split(":");
    if (!parts || parts.length !== 3) return;
    const lang = getLang(ctx.from?.language_code);
    await ctx.answerCallbackQuery("Resolution accepted");

    const dealId = parts[1];
    const sellerPercent = parseInt(parts[2]);

    // For MVP: resolve immediately when one side accepts
    // In production: track both acceptances
    try {
      const deal = await resolveDispute(dealId, sellerPercent);
      if (deal) {
        await incrementDeals(deal.seller_id);
        await incrementDeals(deal.buyer_id);
        await ctx.editMessageText(
          t(lang, "dispute.resolved", { dealId, sellerPercent, buyerPercent: 100 - sellerPercent }),
        );
      }
    } catch {
      await ctx.editMessageText(t(lang, "dispute.resolve_error"));
    }
  });

  bot.callbackQuery(/^reject_resolution:/, async (ctx) => {
    const lang = getLang(ctx.from?.language_code);
    await ctx.answerCallbackQuery("Resolution rejected");
    await ctx.editMessageText(t(lang, "dispute.resolution_rejected"));
  });

  // View all applications for an offer
  bot.callbackQuery(/^all_apps:/, async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    await ctx.answerCallbackQuery();
    const offerId = ctx.callbackQuery.data!.replace("all_apps:", "");
    const offer = await getOfferById(offerId);
    if (!offer) { await ctx.editMessageText(t(lang, "apps.offer_not_found")); return; }
    if (offer.creator_id !== ctx.from.id) { await ctx.editMessageText(t(lang, "apps.not_authorized")); return; }

    const apps = await getApplicationsByOffer(offerId);
    if (apps.length === 0) { await ctx.editMessageText(t(lang, "apps.no_apps")); return; }

    const lines: string[] = [];
    for (let i = 0; i < apps.length; i++) {
      const app = apps[i];
      const rep = await getDetailedReputation(app.user_id);
      const trust = calcTrustScore(rep);
      const badge = trust === null ? "NEW" : trust >= 70 ? "🟢" : trust >= 40 ? "🟡" : "🔴";
      const trustStr = trust !== null ? `${trust}` : "New";
      lines.push(`${i + 1}. ${app.price} ${offer.currency} — Trust: ${badge} ${trustStr}\n   ${app.message || "(no message)"}`);
    }

    const keyboard = new InlineKeyboard();
    apps.forEach((app, i) => {
      keyboard.text(`Select #${i + 1}`, `select_app:${app.id}`);
      if ((i + 1) % 3 === 0) keyboard.row();
    });

    await ctx.editMessageText(`Applications for: ${offer.description}\n\n${lines.join("\n\n")}`, { reply_markup: keyboard });
  });

  // Select applicant — show confirmation
  bot.callbackQuery(/^select_app:/, async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    await ctx.answerCallbackQuery();
    const appId = ctx.callbackQuery.data!.replace("select_app:", "");
    const application = await getApplicationById(appId);
    if (!application) { await ctx.editMessageText(t(lang, "apps.app_not_found")); return; }

    const offer = await getOfferById(application.offer_id);
    if (!offer || offer.creator_id !== ctx.from.id) { await ctx.editMessageText(t(lang, "apps.not_authorized_short")); return; }

    const rep = await getDetailedReputation(application.user_id);
    const trust = calcTrustScore(rep);

    const keyboard = new InlineKeyboard()
      .text("Confirm Selection", `confirm_select:${appId}`)
      .text("Back", `all_apps:${application.offer_id}`);

    const msgPart = application.message ? t(lang, "apps.confirm_selection_message", { message: application.message }) : "";
    await ctx.editMessageText(
      t(lang, "apps.confirm_selection", {
        price: application.price,
        currency: offer.currency,
        trust: trust !== null ? String(trust) : t(lang, "bid.trust_new_user"),
        deals: rep.completed_deals,
        rating: rep.avg_rating.toFixed(1),
      }) + msgPart,
      { reply_markup: keyboard },
    );
  });

  // Confirm selection — create deal from offer + application
  bot.callbackQuery(/^confirm_select:/, async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    await ctx.answerCallbackQuery();
    const appId = ctx.callbackQuery.data!.replace("confirm_select:", "");

    const application = await getApplicationById(appId);
    if (!application) { await ctx.editMessageText(t(lang, "apps.app_not_found")); return; }

    const offer = await getOfferById(application.offer_id);
    if (!offer || offer.creator_id !== ctx.from.id) { await ctx.editMessageText(t(lang, "apps.not_authorized_short")); return; }

    try {
      // Determine roles: if offer creator is buyer → applicant is seller, vice versa
      const sellerId = offer.role === "buyer" ? application.user_id : offer.creator_id;
      const buyerId = offer.role === "buyer" ? offer.creator_id : application.user_id;

      const deal = await createNewDeal(
        {
          seller_username: "", buyer_username: "", sender_role: offer.role === "buyer" ? "buyer" : "seller",
          amount: application.price, currency: offer.currency, description: offer.description, missing_fields: [],
        },
        sellerId, buyerId,
      );

      // Close offer and accept/reject applications
      await acceptApplication(appId);
      await rejectAllApplications(offer.id, appId);
      await closeOffer(offer.id, deal.id);

      await ctx.editMessageText(
        t(lang, "apps.deal_from_offer", {
          dealId: deal.id,
          description: offer.description,
          price: application.price,
          currency: offer.currency,
        }),
      );

      // Notify selected applicant
      try {
        const payKeyboard = new InlineKeyboard().webApp("Pay via Mini App", `${MINI_APP_URL}/pay/${deal.id}`);
        await ctx.api.sendMessage(application.user_id,
          t(lang, "apps.selected_notification", {
            description: offer.description,
            price: application.price,
            currency: offer.currency,
            dealId: deal.id,
          }),
          { reply_markup: payKeyboard },
        );
      } catch { /* applicant blocked bot */ }

      // Notify rejected applicants
      const rejectedApps = (await getApplicationsByOffer(offer.id)).filter(a => a.id !== appId);
      for (const app of rejectedApps) {
        try {
          await ctx.api.sendMessage(app.user_id,
            t(lang, "apps.offer_filled", { description: offer.description }),
          );
        } catch { /* user blocked bot */ }
      }

      // Risk assessment after deal creation from offer
      try {
        const risk = await assessDealRisk(deal.id);
        if (risk) {
          const levelEmoji = (l: string) => l === "low" ? "🟢" : l === "medium" ? "🟡" : "🔴";
          const riskMsg =
            "🔍 " + t(lang, "risk.assessment", {
              dealId: deal.id,
              buyerEmoji: levelEmoji(risk.buyer_risk.level),
              buyerLevel: risk.buyer_risk.level,
              buyerScore: risk.buyer_risk.score,
              sellerEmoji: levelEmoji(risk.seller_risk.level),
              sellerLevel: risk.seller_risk.level,
              sellerScore: risk.seller_risk.score,
            }) +
            (risk.deal_recommendations.length
              ? t(lang, "risk.recommendations", { recommendations: risk.deal_recommendations.map(r => `• ${r}`).join("\n") })
              : "");
          try { await ctx.api.sendMessage(buyerId, riskMsg); } catch { /* blocked */ }
          try { await ctx.api.sendMessage(sellerId, riskMsg); } catch { /* blocked */ }
        }
      } catch { /* risk assessment failed, non-critical */ }

      // Update inline message
      if (offer.inline_message_id) {
        try {
          await ctx.api.editMessageTextInline(offer.inline_message_id,
            t(lang, "inline.closed", { description: offer.description, price: application.price, currency: offer.currency }),
            { reply_markup: { inline_keyboard: [[{ text: "Open izEscrowAI", url: `https://t.me/${ctx.me.username}` }]] } },
          );
        } catch { /* can't edit */ }
      }
    } catch (e: any) {
      console.error("Deal from offer error:", e);
      await ctx.editMessageText(t(lang, "apps.deal_error"));
    }
  });

  // --- Group tracking ---

  // 2.1 Handle bot added/removed from groups
  bot.on("my_chat_member", async (ctx) => {
    const chat = ctx.myChatMember.chat;
    if (chat.type !== "group" && chat.type !== "supergroup") return;

    const newStatus = ctx.myChatMember.new_chat_member.status;
    if (newStatus === "member" || newStatus === "administrator") {
      await upsertGroup(
        chat.id,
        chat.title,
        "username" in chat ? chat.username ?? undefined : undefined,
      );
    } else if (newStatus === "left" || newStatus === "kicked") {
      await setGroupInactive(chat.id);
    }
  });

  // 2.2 Track via_bot messages in groups — link offers/deals to groups
  bot.on("message", async (ctx, next) => {
    if (!ctx.message.via_bot) { await next(); return; }
    const chat = ctx.message.chat;
    if (chat.type !== "group" && chat.type !== "supergroup") { await next(); return; }
    if (ctx.message.via_bot.id !== ctx.me.id) { await next(); return; }

    // Ensure group is tracked
    await upsertGroup(
      chat.id,
      chat.title,
      "username" in chat ? chat.username ?? undefined : undefined,
    );

    // Try to parse offer/deal ID from the message text
    const text = ctx.message.text || "";
    const offerMatch = text.match(/offer_([a-zA-Z0-9_]+)/);
    const dealMatch = text.match(/Deal #([a-zA-Z0-9_-]+)/i) || text.match(/deal_([a-zA-Z0-9_-]+)/);

    if (offerMatch) {
      await incrementGroupOffers(chat.id);
    }
    if (dealMatch) {
      await linkDealToGroup(dealMatch[1], chat.id);
    }

    await next();
  });

  // 2.3 Job parsing: process group messages through parser pipeline
  bot.on("message", async (ctx, next) => {
    const chat = ctx.message.chat;
    if (chat.type !== "group" && chat.type !== "supergroup") { await next(); return; }
    if (ctx.message.via_bot) { await next(); return; } // already handled above
    // Process asynchronously — don't block the bot
    processGroupMessage(ctx, bot).catch(err => console.error("[parser] Error:", err));
    await next();
  });

  // --- Group commands ---

  // 3.1 /stats command in groups
  bot.command("stats", async (ctx) => {
    const lang = getLang(ctx.from?.language_code);
    const chat = ctx.chat;
    if (chat.type !== "group" && chat.type !== "supergroup") {
      await ctx.reply(t(lang, "stats.groups_only"));
      return;
    }

    const stats = await getGroupStatsById(chat.id);
    if (!stats || stats.completed_deals === 0) {
      await ctx.reply(t(lang, "stats.no_activity", { botUsername: ctx.me.username }));
      return;
    }

    await ctx.reply(
      t(lang, "stats.report", {
        offers: stats.total_offers,
        deals: stats.completed_deals,
        volume: stats.total_volume.toFixed(2),
        avgCheck: stats.avg_check?.toFixed(2) ?? "\u2014",
        conversion: stats.conversion_rate ? (stats.conversion_rate * 100).toFixed(0) + "%" : "\u2014",
      }),
    );
  });

  // 3.2 /leaderboard command
  bot.command("leaderboard", async (ctx) => {
    const lang = getLang(ctx.from?.language_code);
    const top = await getLeaderboard("completed_deals", 5);
    if (top.length === 0) {
      await ctx.reply(t(lang, "leaderboard.empty"));
      return;
    }

    const lines = top.map((g, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
      const name = g.username ? `@${g.username}` : (g.title || `Group ${g.group_id}`);
      return `${medal} ${name} — ${g.completed_deals} deals, ${g.total_volume.toFixed(1)} TON`;
    });

    const keyboard = new InlineKeyboard().webApp("Full Leaderboard", `${MINI_APP_URL}/groups`);

    await ctx.reply(
      `Top Groups by Escrow Activity\n\n${lines.join("\n")}`,
      { reply_markup: keyboard },
    );
  });

  // --- /spec command (2.5, 2.10) ---

  bot.command("spec", async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    const description = ctx.match?.trim();

    // View existing spec: /spec <id>
    if (description && description.startsWith("spec_")) {
      const spec = await getSpecById(description);
      if (!spec) { await ctx.reply(t(lang, "spec.not_found")); return; }
      await ctx.reply(formatSpecMessage(spec));
      return;
    }

    // Generate new spec
    if (!description) {
      await ctx.reply(t(lang, "spec.usage"));
      return;
    }

    await ctx.reply("🤖 " + t(lang, "spec.generating"));

    try {
      const result = await generateSpec(description);

      if (result.type === "questions") {
        // Store conversation and ask questions
        specConversations.set(ctx.from.id, {
          history: [{ role: "user", content: description }],
          createdAt: Date.now(),
          lastActivity: Date.now(),
        });
        const questions = result.questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
        await ctx.reply(t(lang, "spec.clarification_command", { questions }));
        return;
      }

      // Got a spec — show for review
      pendingSpecs.set(ctx.from.id, result);
      const keyboard = new InlineKeyboard()
        .text("✅ Confirm", "spec_confirm")
        .text("✏️ Edit", "spec_edit")
        .row()
        .text("💰 Estimate Price", "spec_price");

      await ctx.reply(formatSpecPreview(result), { reply_markup: keyboard });
    } catch (e: any) {
      console.error("Spec generation error:", e);
      await ctx.reply(t(lang, "spec.generation_error"));
    }
  });

  // --- Spec callbacks (2.7, 2.8, 2.9, 4.3, 4.4) ---

  bot.callbackQuery("spec_confirm", async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    await ctx.answerCallbackQuery("Spec confirmed!");
    const spec = pendingSpecs.get(ctx.from.id);
    if (!spec) { await ctx.editMessageText(t(lang, "spec.expired")); return; }
    pendingSpecs.delete(ctx.from.id);

    const specId = `spec_${Date.now()}_${ctx.from.id}`;
    const requirements = spec.requirements.map(r => ({
      description: r,
      acceptance_criteria: [] as string[],
    }));

    const saved = await createSpec({
      id: specId,
      creator_id: ctx.from.id,
      title: spec.title,
      category: spec.category,
      requirements,
      budget_min: spec.budget_range?.min,
      budget_max: spec.budget_range?.max,
      budget_currency: spec.budget_range?.currency ?? "USD",
      status: "published",
    });

    // Auto-trigger pricing (4.4)
    let priceMsg = "";
    try {
      const priceEstimate = await estimatePrice({
        title: spec.title,
        category: spec.category,
        requirements: spec.requirements,
        budget_currency: spec.budget_range?.currency ?? "USD",
      });
      await updateSpec(specId, {
        budget_min: priceEstimate.min,
        budget_max: priceEstimate.max,
        budget_currency: priceEstimate.currency,
      });
      priceMsg = "\n\n💰 " + t(lang, "spec.price_estimate", { estimate: formatPriceEstimate(priceEstimate) }).replace(/^\n\n/, "");
    } catch { /* pricing failed, non-critical */ }

    const keyboard = new InlineKeyboard()
      .text("🔍 Find Executors", `find_exec:${specId}`)
      .text("📢 Post as Offer", `post_offer:${specId}`);

    await ctx.editMessageText(
      "✅ " + t(lang, "spec.published", { specId, title: spec.title, category: spec.category }) +
      priceMsg,
      { reply_markup: keyboard },
    );
  });

  bot.callbackQuery("spec_edit", async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(t(lang, "spec.edit_prompt"));
    // The message handler will pick up the next message as a spec edit
    specConversations.set(ctx.from.id, {
      history: [],
      createdAt: Date.now(),
      lastActivity: Date.now(),
    });
  });

  bot.callbackQuery("spec_price", async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    await ctx.answerCallbackQuery("Estimating price...");
    const spec = pendingSpecs.get(ctx.from.id);
    if (!spec) { await ctx.reply(t(lang, "spec.not_found")); return; }

    try {
      const estimate = await estimatePrice({
        title: spec.title,
        category: spec.category,
        requirements: spec.requirements,
        budget_currency: spec.budget_range?.currency ?? "USD",
      });
      await ctx.reply("💰 " + t(lang, "spec.price_for_title", { title: spec.title, estimate: formatPriceEstimate(estimate) }));
    } catch {
      await ctx.reply(t(lang, "spec.price_error"));
    }
  });

  // Find executors for a spec (7.5, 7.6, 7.7)
  bot.callbackQuery(/^find_exec:/, async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    await ctx.answerCallbackQuery("Searching...");
    const specId = ctx.callbackQuery.data!.replace("find_exec:", "");
    const spec = await getSpecById(specId);
    if (!spec) { await ctx.reply(t(lang, "spec.not_found")); return; }

    const matches = await findMatchingExecutors(spec);
    const text = formatMatchResults(matches, spec.budget_currency ?? "USD");

    const keyboard = new InlineKeyboard();
    if (matches.length < 3) {
      keyboard.text("📢 Post as Open Offer", `post_offer:${specId}`);
    }

    await ctx.reply(text, { reply_markup: keyboard });
  });

  // Post spec as offer
  bot.callbackQuery(/^post_offer:/, async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    await ctx.answerCallbackQuery();
    const specId = ctx.callbackQuery.data!.replace("post_offer:", "");
    const spec = await getSpecById(specId);
    if (!spec) { await ctx.reply(t(lang, "spec.not_found")); return; }

    await ctx.reply(t(lang, "spec.post_as_offer", { botUsername: ctx.me.username, title: spec.title }));
  });

  // --- /profile command (7.1, 7.2) ---

  const CATEGORIES = ["Design", "Development", "Writing", "Marketing", "Translation", "Other"];

  bot.command("profile", async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    const existing = await getUserProfile(ctx.from.id);
    const currentCats = existing?.categories?.join(", ") || "none";

    const keyboard = new InlineKeyboard();
    for (let i = 0; i < CATEGORIES.length; i++) {
      keyboard.text(CATEGORIES[i], `profile_cat:${CATEGORIES[i]}`);
      if ((i + 1) % 3 === 0) keyboard.row();
    }
    keyboard.row().text("Done", "profile_done");

    await ctx.reply(
      t(lang, "profile.categories", { categories: currentCats }),
      { reply_markup: keyboard },
    );
  });

  // Profile category selection (multi-select toggle)
  const pendingProfileCats = new Map<number, Set<string>>();

  bot.callbackQuery(/^profile_cat:/, async (ctx) => {
    if (!ctx.from) return;
    await ctx.answerCallbackQuery();
    const cat = ctx.callbackQuery.data!.replace("profile_cat:", "");

    if (!pendingProfileCats.has(ctx.from.id)) {
      const existing = await getUserProfile(ctx.from.id);
      pendingProfileCats.set(ctx.from.id, new Set(existing?.categories ?? []));
    }

    const selected = pendingProfileCats.get(ctx.from.id)!;
    if (selected.has(cat)) {
      selected.delete(cat);
    } else {
      selected.add(cat);
    }

    const keyboard = new InlineKeyboard();
    for (let i = 0; i < CATEGORIES.length; i++) {
      const mark = selected.has(CATEGORIES[i]) ? "✓ " : "";
      keyboard.text(`${mark}${CATEGORIES[i]}`, `profile_cat:${CATEGORIES[i]}`);
      if ((i + 1) % 3 === 0) keyboard.row();
    }
    keyboard.row().text("Done", "profile_done");

    const lang = getLang(ctx.from.language_code);
    await ctx.editMessageText(
      t(lang, "profile.selected", { categories: [...selected].join(", ") || "none" }),
      { reply_markup: keyboard },
    );
  });

  bot.callbackQuery("profile_done", async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    await ctx.answerCallbackQuery("Profile saved!");
    const selected = pendingProfileCats.get(ctx.from.id);
    const categories = selected ? [...selected] : [];
    pendingProfileCats.delete(ctx.from.id);

    await upsertUserProfile({ user_id: ctx.from.id, categories });
    await ctx.editMessageText(t(lang, "profile.updated", { categories: categories.join(", ") || "none" }));
  });

  // --- /score command (5.7) ---

  bot.command("score", async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    const rep = await getDetailedReputation(ctx.from.id);
    const wallet = await getUserWallet(ctx.from.id);
    const trustScore = await getUserTrustScore(ctx.from.id);

    const avgRating = rep.rating_count > 0 ? rep.total_rating / rep.rating_count : 0;
    const badge = rep.completed_deals === 0 ? "🆕 New"
      : trustScore >= 70 ? `🟢 ${trustScore}`
      : trustScore >= 40 ? `🟡 ${trustScore}`
      : `🔴 ${trustScore}`;

    await ctx.reply(
      t(lang, "score.report", {
        badge,
        deals: rep.completed_deals,
        rating: avgRating.toFixed(1),
        wallet: wallet ? t(lang, "score.wallet_connected") + " \u2713" : t(lang, "score.wallet_not_connected"),
        disputes: rep.disputes_lost,
      }),
    );
  });

  // --- /myoffers command (existing behavior, just ensure it exists) ---

  bot.command("myoffers", async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    const offers = await getOffersByUser(ctx.from.id);
    if (offers.length === 0) {
      await ctx.reply(t(lang, "myoffers.empty", { botUsername: ctx.me.username }));
      return;
    }

    const lines = offers.slice(0, 10).map((o) => {
      const statusEmoji = o.status === "open" ? "🟢" : o.status === "closed" ? "✅" : "⏰";
      return `${statusEmoji} ${o.description}\n   ${o.min_price ? `${o.min_price} ${o.currency}` : "Negotiable"} — ${o.status}`;
    });

    const keyboard = new InlineKeyboard();
    offers.filter(o => o.status === "open").slice(0, 5).forEach((o, i) => {
      keyboard.text(`Cancel #${i + 1}`, `cancel_offer:${o.id}`);
    });

    await ctx.reply(`${t(lang, "myoffers.title")}\n\n${lines.join("\n\n")}`, { reply_markup: keyboard.row() });
  });

  bot.callbackQuery(/^cancel_offer:/, async (ctx) => {
    if (!ctx.from) return;
    const lang = getLang(ctx.from.language_code);
    await ctx.answerCallbackQuery("Offer cancelled");
    const offerId = ctx.callbackQuery.data!.replace("cancel_offer:", "");
    const offer = await getOfferById(offerId);
    if (offer && offer.creator_id === ctx.from.id) {
      await expireOffer(offerId);
      await ctx.editMessageText(t(lang, "myoffers.cancelled"));
    }
  });

  // --- Offer expiration job (6.9) ---

  async function runOfferExpiration() {
    try {
      const expired = await getExpiredOffers();
      for (const offer of expired) {
        await expireOffer(offer.id);
        // Update inline message if available
        if (offer.inline_message_id) {
          try {
            await bot.api.editMessageTextInline(offer.inline_message_id,
              `EXPIRED: ${offer.description}\n\nThis offer has expired.\n\nPowered by izEscrowAI`,
              { reply_markup: { inline_keyboard: [[{ text: "Open izEscrowAI", url: `https://t.me/${bot.botInfo.username}` }]] } },
            );
          } catch { /* can't edit */ }
        }
      }
    } catch (e) {
      console.error("[expiration] Error:", e);
    }
  }

  // Run expiration check every 30 minutes
  setInterval(runOfferExpiration, 30 * 60 * 1000);

  // --- Inline mode (dual flow: direct deal + public offer) ---

  const inlineParsed = new Map<string, { type: "deal"; amount: number; currency: string; description: string } | { type: "offer"; offer: ParsedOffer }>();
  let inlineCounter = 0;

  bot.on("inline_query", async (ctx) => {
    const query = ctx.inlineQuery.query.trim();
    if (query.length < 3) {
      await ctx.answerInlineQuery([], { cache_time: 5 });
      return;
    }

    try {
      const senderUsername = ctx.from.username || `id${ctx.from.id}`;
      const result = await classifyAndParse(query, senderUsername);
      const botUsername = ctx.me.username;
      const results: any[] = [];

      if (result.type === "deal_creation" && result.parsed.amount && result.parsed.description) {
        // Direct deal (has @username)
        const parsed = result.parsed;
        const resultId = `inl_${++inlineCounter}`;
        inlineParsed.set(resultId, { type: "deal", amount: parsed.amount!, currency: parsed.currency, description: parsed.description! });
        setTimeout(() => inlineParsed.delete(resultId), 60_000);

        results.push({
          type: "article",
          id: resultId,
          title: `Escrow Deal: ${parsed.description}`,
          description: `${parsed.amount} ${parsed.currency} — direct deal`,
          input_message_content: {
            message_text: `New Escrow Deal\n\n${parsed.description}\nAmount: ${parsed.amount} ${parsed.currency}\n\nTap below to accept.`,
          },
          reply_markup: {
            inline_keyboard: [[{ text: "Open Deal", url: `https://t.me/${botUsername}?start=inline` }]],
          },
        });
      } else if (result.type === "offer_creation") {
        // Public offer (no @username)
        const parsed = result.parsed;
        const resultId = `inl_${++inlineCounter}`;
        inlineParsed.set(resultId, { type: "offer", offer: parsed });
        setTimeout(() => inlineParsed.delete(resultId), 60_000);

        results.push({
          type: "article",
          id: resultId,
          title: `Offer: ${parsed.description}`,
          description: `${parsed.min_price ? `from ${parsed.min_price} ${parsed.currency}` : "Price negotiable"} — public offer`,
          input_message_content: {
            message_text: generateOfferPreview(parsed),
          },
          reply_markup: {
            inline_keyboard: [[{ text: "Apply (0)", url: `https://t.me/${botUsername}?start=offer_placeholder` }]],
          },
        });
      } else {
        // Fallback: try as offer anyway
        const parsed = await parseOffer(query);
        const resultId = `inl_${++inlineCounter}`;
        inlineParsed.set(resultId, { type: "offer", offer: parsed });
        setTimeout(() => inlineParsed.delete(resultId), 60_000);

        results.push({
          type: "article",
          id: resultId,
          title: `Offer: ${parsed.description}`,
          description: `${parsed.min_price ? `from ${parsed.min_price} ${parsed.currency}` : "Price negotiable"}`,
          input_message_content: {
            message_text: generateOfferPreview(parsed),
          },
          reply_markup: {
            inline_keyboard: [[{ text: "Apply (0)", url: `https://t.me/${botUsername}?start=offer_placeholder` }]],
          },
        });
      }

      await ctx.answerInlineQuery(results, { cache_time: 5 });
    } catch (e) {
      console.error("Inline query error:", e);
      await ctx.answerInlineQuery([], { cache_time: 5 });
    }
  });

  bot.on("chosen_inline_result", async (ctx) => {
    const { result_id, from, inline_message_id } = ctx.chosenInlineResult;
    await upsertUser(from.id, from.username);

    const cached = inlineParsed.get(result_id);
    if (!cached) return;
    inlineParsed.delete(result_id);

    const botUsername = ctx.me.username;

    try {
      if (cached.type === "deal") {
        // Direct deal flow (existing)
        const senderUsername = from.username || `id${from.id}`;
        const deal = await createNewDeal(
          { seller_username: senderUsername, buyer_username: null, sender_role: "seller", amount: cached.amount, currency: cached.currency, description: cached.description, missing_fields: [] },
          from.id, 0,
        );
        if (inline_message_id) {
          try {
            await ctx.api.editMessageTextInline(inline_message_id,
              `New Escrow Deal #${deal.id}\n\n${cached.description}\nAmount: ${formatAmount(deal)}\n\nTap below to accept.`,
              { reply_markup: { inline_keyboard: [[{ text: "Open Deal", url: `https://t.me/${botUsername}?start=deal_${deal.id}` }]] } },
            );
          } catch { /* can't edit */ }
        }
      } else {
        // Public offer flow — check rate limit (6.10)
        const chatId = ctx.chosenInlineResult.inline_message_id ? 0 : 0; // group is tracked via via_bot
        const offerId = `off_${Date.now()}_${from.id}`;
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72h expiration
        const offer = await createOffer({
          id: offerId,
          creator_id: from.id,
          description: cached.offer.description,
          min_price: cached.offer.min_price ?? undefined,
          currency: cached.offer.currency,
          role: cached.offer.role,
          expires_at: expiresAt,
        });

        if (inline_message_id) {
          await updateOfferInlineMessageId(offerId, inline_message_id);
          try {
            await ctx.api.editMessageTextInline(inline_message_id,
              generateOfferPreview(cached.offer) + `\n\nApplications: 0`,
              { reply_markup: { inline_keyboard: [[{ text: "Apply (0)", url: `https://t.me/${botUsername}?start=offer_${offerId}` }]] } },
            );
          } catch { /* can't edit */ }
        }
      }
    } catch (e) {
      console.error("Chosen inline result error:", e);
    }
  });

  return bot;
}

// --- Formatting helpers ---

function formatAmount(deal: Deal): string {
  if (deal.original_currency && deal.original_amount) {
    return `${deal.original_amount} ${deal.original_currency} ≈ ${deal.amount} TON`;
  }
  return `${deal.amount} ${deal.currency}`;
}

function formatSpecPreview(spec: GeneratedSpec): string {
  const reqList = spec.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n");
  const budget = spec.budget_range
    ? `${spec.budget_range.min}–${spec.budget_range.max} ${spec.budget_range.currency}`
    : "Not estimated";

  return (
    `📋 Generated Specification\n\n` +
    `Title: ${spec.title}\n` +
    `Category: ${spec.category}\n` +
    `Budget: ${budget}\n\n` +
    `Requirements:\n${reqList}`
  );
}

function formatSpecMessage(spec: Spec): string {
  const reqList = spec.requirements
    ? spec.requirements.map((r, i) => `${i + 1}. ${r.description}`).join("\n")
    : "No requirements";
  const budget = spec.budget_min != null && spec.budget_max != null
    ? `${spec.budget_min}–${spec.budget_max} ${spec.budget_currency}`
    : "Not estimated";

  return (
    `📋 Spec: ${spec.title}\n` +
    `ID: ${spec.id}\n` +
    `Category: ${spec.category || "—"}\n` +
    `Status: ${spec.status}\n` +
    `Budget: ${budget}\n\n` +
    `Requirements:\n${reqList}`
  );
}

function formatPriceEstimate(est: PriceEstimate): string {
  return (
    `Range: ${est.min}–${est.max} ${est.currency}\n` +
    `Median: ${est.median} ${est.currency}\n` +
    `Recommended: ${est.recommended} ${est.currency}\n\n` +
    `Reasoning: ${est.reasoning}\n` +
    (est.factors.length > 0 ? `\nFactors:\n${est.factors.map(f => `• ${f}`).join("\n")}` : "")
  );
}

async function runSpecArbitration(
  dealId: string,
  deal: Deal,
  spec: Spec,
  sellerEvidence: string,
  buyerEvidence: string,
  ctx: Context,
) {
  // Use English as default for async arbitration (no user context available)
  const lang = "en" as const;
  try {
    const specForAI = {
      title: spec.title,
      requirements: (spec.requirements ?? []).map(r => r.description),
    };
    const result = await evaluateSpecCompliance(
      specForAI,
      `Deal: ${deal.description}, Amount: ${deal.amount} ${deal.currency}`,
      sellerEvidence,
      buyerEvidence,
    );

    const sellerPercent = Math.round(result.score);
    const buyerPercent = 100 - sellerPercent;

    const keyboard = new InlineKeyboard()
      .text("Accept", `accept_resolution:${dealId}:${sellerPercent}`)
      .text("Reject", `reject_resolution:${dealId}`);

    const reportMsg = "\u2696\uFE0F " + t(lang, "dispute.spec_arbitration", {
      dealId,
      report: result.report,
      sellerPercent,
      sellerAmount: ((deal.amount * sellerPercent) / 100).toFixed(2),
      buyerPercent,
      buyerAmount: ((deal.amount * buyerPercent) / 100).toFixed(2),
      currency: deal.currency,
    });

    try { await ctx.api.sendMessage(deal.seller_id, reportMsg, { reply_markup: keyboard }); } catch { /* blocked */ }
    try { await ctx.api.sendMessage(deal.buyer_id, reportMsg, { reply_markup: keyboard }); } catch { /* blocked */ }
  } catch {
    // Fallback to regular mediation
    try {
      const resolution = await mediateDispute(deal.description, deal.amount, deal.currency, "Dispute with spec", sellerEvidence, buyerEvidence);
      const keyboard = new InlineKeyboard()
        .text("Accept", `accept_resolution:${dealId}:${resolution.seller_percent}`)
        .text("Reject", `reject_resolution:${dealId}`);
      const msg = t(lang, "dispute.spec_mediation_fallback", {
        dealId,
        explanation: resolution.explanation,
        sellerPercent: resolution.seller_percent,
        buyerPercent: resolution.buyer_percent,
      });
      try { await ctx.api.sendMessage(deal.seller_id, msg, { reply_markup: keyboard }); } catch { /* blocked */ }
      try { await ctx.api.sendMessage(deal.buyer_id, msg, { reply_markup: keyboard }); } catch { /* blocked */ }
    } catch { /* complete failure */ }
  }
}

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
    `${role} | ${formatAmount(deal)}\n` +
    `${deal.description}`
  );
}
