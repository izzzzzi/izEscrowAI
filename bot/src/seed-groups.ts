/**
 * Seed demo group analytics data for hackathon presentation.
 * Run: npx tsx src/seed-groups.ts
 */
import "dotenv/config";
import { getDb, closeDb, upsertGroup, incrementGroupOffers, updateGroupStatsOnCompletion } from "./db/index.js";

async function seed() {
  console.log("Seeding group analytics demo data...\n");
  getDb();

  const groups = [
    { id: -1001234567890, title: "TON Freelancers", username: "tonfreelancers", members: 2450 },
    { id: -1001234567891, title: "Web3 Design Hub", username: "web3designhub", members: 890 },
    { id: -1001234567892, title: "Crypto Developers", username: "cryptodevs", members: 5200 },
    { id: -1001234567893, title: "TON DeFi Chat", username: "tondefi", members: 3100 },
    { id: -1001234567894, title: "Telegram Bot Makers", username: "tgbotmakers", members: 1600 },
  ];

  for (const g of groups) {
    await upsertGroup(g.id, g.title, g.username, g.members);

    // Simulate offers
    const offerCount = Math.floor(Math.random() * 30) + 5;
    for (let i = 0; i < offerCount; i++) {
      await incrementGroupOffers(g.id);
    }

    // Simulate completed deals
    const dealCount = Math.floor(offerCount * (0.3 + Math.random() * 0.4));
    for (let i = 0; i < dealCount; i++) {
      const amount = 10 + Math.random() * 90;
      await updateGroupStatsOnCompletion(g.id, amount);
    }

    console.log(`  ${g.title}: ${offerCount} offers, ${dealCount} deals`);
  }

  console.log("\nDone!");
  await closeDb();
}

seed().catch(console.error);
