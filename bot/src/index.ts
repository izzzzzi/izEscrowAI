import "dotenv/config";
import { createBot } from "./bot/index.js";
import { createApiServer } from "./api/index.js";
import { getDb } from "./db/index.js";
import { checkTimeouts, checkFundingStatus, getActiveDeals } from "./deals/index.js";

// --- Validate env ---
const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required");
  process.exit(1);
}

// --- Initialize DB ---
console.log("Initializing database...");
getDb();

// --- Start API server ---
const PORT = parseInt(process.env.PORT || "3000");
createApiServer(PORT);

// --- Start bot ---
const bot = createBot(BOT_TOKEN);

bot.start({
  onStart: () => console.log("Bot started!"),
});

// --- Periodic jobs ---

// Check for funding every 30 seconds
setInterval(async () => {
  try {
    const deals = getActiveDeals();
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

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down...");
  bot.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Shutting down...");
  bot.stop();
  process.exit(0);
});
