// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 izEscrowAI contributors

import "dotenv/config";
import { createBot } from "./bot/index.js";
import { createApiServer } from "./api/index.js";
import { getDb, closeDb } from "./db/index.js";
import { initAI } from "./ai/index.js";
import { checkTimeouts, checkFundingStatus, getActiveDeals, requoteExpiredRates } from "./deals/index.js";
import { markJobsExpired, getActiveChannelWebSources, getAllSources, createSource } from "./db/index.js";
import { runScrapeCycle } from "./parser/scraper.js";
import { processMessageText } from "./parser/index.js";
import { getTonClient, getArbiterAddress } from "./blockchain/index.js";
import { fromNano } from "@ton/ton";

// --- Validate env ---
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required");
  process.exit(1);
}

// --- Initialize DB ---
console.log("Initializing database...");
getDb();

// --- Initialize AI config ---
await initAI();

// --- Start bot ---
const bot = createBot(BOT_TOKEN);

// --- Start API server (with bot instance for notifications) ---
const PORT = parseInt(process.env.PORT || "3000");
createApiServer(PORT, bot);

bot.start({
  onStart: () => console.log("Bot started!"),
});

// --- Seed initial channel_web sources ---
const SEED_CHANNELS = [
  { username: "tonhunt", title: "TON Jobs" },
  { username: "designhunters", title: "Design Hunters" },
  { username: "job_for_designers", title: "Job for Designers" },
  { username: "freelance_design_job", title: "Freelance Design Job" },
  { username: "love_it_hate", title: "Айтишка (IT/AI)" },
];

try {
  const existing = await getAllSources();
  const existingUsernames = new Set(existing.map(s => s.username?.toLowerCase()));
  for (const ch of SEED_CHANNELS) {
    if (!existingUsernames.has(ch.username.toLowerCase())) {
      await createSource({
        id: `src_seed_${ch.username}`,
        type: "channel_web",
        title: ch.title,
        username: ch.username,
      });
      console.log(`[seed] Added channel_web source: @${ch.username}`);
    }
  }
} catch (e) {
  console.error("Seed sources error:", e);
}

// --- Periodic jobs ---

// Check for funding every 30 seconds
setInterval(async () => {
  try {
    const deals = await getActiveDeals();
    for (const deal of deals) {
      if (deal.status === "confirmed" && deal.contract_address) {
        const funded = await checkFundingStatus(deal.id);
        if (funded) {
          console.log(`Deal ${deal.id} funded!`);
          // Notify parties via bot
          try {
            await bot.api.sendMessage(
              deal.buyer_id,
              `Deal #${deal.id}: payment confirmed! Waiting for the seller to deliver.`,
            );
            await bot.api.sendMessage(deal.seller_id, `Deal #${deal.id}: buyer has paid! Complete the work and mark as delivered.`, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "Mark as delivered", callback_data: `delivered:${deal.id}` }],
                ],
              },
            });
          } catch {
            // User might have blocked the bot
          }
        }
      }
    }
  } catch (e) {
    console.error("Funding check error:", e);
  }
}, 30000);

// Check timeouts every 5 minutes
setInterval(async () => {
  try {
    const expired = await checkTimeouts();
    for (const deal of expired) {
      console.log(`Deal ${deal.id} auto-completed (timeout)`);
      try {
        await bot.api.sendMessage(
          deal.seller_id,
          `Deal #${deal.id}: funds have been automatically released to you (7-day timeout).`,
        );
        await bot.api.sendMessage(
          deal.buyer_id,
          `Deal #${deal.id}: funds have been automatically released to the seller (7-day timeout).`,
        );
      } catch {
        // ignore
      }
    }
  } catch (e) {
    console.error("Timeout check error:", e);
  }
}, 5 * 60 * 1000);

// Re-quote expired rates every 5 minutes
setInterval(async () => {
  try {
    const requoted = await requoteExpiredRates();
    for (const deal of requoted) {
      console.log(`Deal ${deal.id} re-quoted: ${deal.original_amount} ${deal.original_currency} → ${deal.amount} TON`);
      try {
        await bot.api.sendMessage(
          deal.buyer_id,
          `Deal #${deal.id}: rate expired and was updated.\nNew amount: ${deal.amount} TON (${deal.original_amount} ${deal.original_currency})`,
        );
        await bot.api.sendMessage(
          deal.seller_id,
          `Deal #${deal.id}: rate expired and was updated.\nNew amount: ${deal.amount} TON (${deal.original_amount} ${deal.original_currency})`,
        );
      } catch {
        // ignore
      }
    }
  } catch (e) {
    console.error("Rate re-quote error:", e);
  }
}, 5 * 60 * 1000);

// Scrape public Telegram channels every 5 minutes (+ run immediately on start)
setTimeout(() => {
  runScrapeCycle(getActiveChannelWebSources, processMessageText).catch(e =>
    console.error("Channel scrape error:", e),
  );
}, 10_000); // 10s delay to let DB settle
setInterval(async () => {
  try {
    await runScrapeCycle(getActiveChannelWebSources, processMessageText);
  } catch (e) {
    console.error("Channel scrape error:", e);
  }
}, 5 * 60 * 1000);

// Expire old parsed jobs every hour
setInterval(async () => {
  try {
    await markJobsExpired();
  } catch (e) {
    console.error("Job expiration error:", e);
  }
}, 60 * 60 * 1000);

// Check arbiter balance every 5 minutes
setInterval(async () => {
  try {
    const client = getTonClient();
    const arbiterAddr = await getArbiterAddress();
    const balance = await client.getBalance(arbiterAddr);
    const balanceTon = parseFloat(fromNano(balance));
    if (balanceTon < 1) {
      console.warn(`WARNING: Arbiter wallet balance is low: ${balanceTon.toFixed(2)} TON. Top up to ensure gas for operations.`);
    }
  } catch (e) {
    console.error("Arbiter balance check error:", e);
  }
}, 5 * 60 * 1000);

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down...");
  bot.stop();
  await closeDb();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  bot.stop();
  await closeDb();
  process.exit(0);
});
