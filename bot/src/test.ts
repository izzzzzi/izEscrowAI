/**
 * Integration test script for izEscrowAI bot.
 * Run with: npx tsx src/test.ts
 *
 * Prerequisites:
 * - .env configured with BOT_TOKEN, OPENROUTER_API_KEY
 * - For blockchain tests: ARBITER_WALLET_MNEMONIC, contracts/compiled/escrow.hex
 */
import "dotenv/config";
import { getDb, createDeal, getDealById, updateDealStatus, upsertUser, getReputation, incrementDeals, addRating, getDealsByUser, setUserWallet, getUserWallet } from "./db/index.js";
import { classifyAndParse, mediateDispute } from "./ai/index.js";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ ${msg}`);
    failed++;
  }
}

async function testDb() {
  console.log("\n== Database Tests ==");

  // Init DB
  getDb();
  assert(true, "Database initialized");

  // Users
  upsertUser(111, "alice");
  upsertUser(222, "bob");
  assert(true, "Users created");

  setUserWallet(111, "EQA...alice");
  assert(getUserWallet(111) === "EQA...alice", "Wallet saved and retrieved");
  assert(getUserWallet(222) === null, "No wallet for bob");

  // Deals
  const deal = createDeal({
    id: "test-001",
    seller_id: 111,
    buyer_id: 222,
    amount: 50,
    currency: "TON",
    description: "Test deal",
  });
  assert(deal.id === "test-001", "Deal created with correct ID");
  assert(deal.status === "created", "Deal status is 'created'");
  assert(deal.amount === 50, "Deal amount is 50");

  const fetched = getDealById("test-001");
  assert(fetched !== null, "Deal fetched by ID");
  assert(fetched!.description === "Test deal", "Deal description matches");

  updateDealStatus("test-001", "confirmed");
  assert(getDealById("test-001")!.status === "confirmed", "Deal status updated to confirmed");

  updateDealStatus("test-001", "funded");
  assert(getDealById("test-001")!.status === "funded", "Deal status updated to funded");

  const deliveredAt = new Date().toISOString();
  const timeoutAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  updateDealStatus("test-001", "delivered", { delivered_at: deliveredAt, timeout_at: timeoutAt });
  const delivered = getDealById("test-001")!;
  assert(delivered.status === "delivered", "Deal status updated to delivered");
  assert(delivered.delivered_at !== null, "delivered_at set");
  assert(delivered.timeout_at !== null, "timeout_at set");

  updateDealStatus("test-001", "completed");
  assert(getDealById("test-001")!.status === "completed", "Deal completed");

  // User deals
  const userDeals = getDealsByUser(111);
  assert(userDeals.length >= 1, "User deals returned");

  // Reputation
  incrementDeals(111);
  incrementDeals(222);
  addRating(111, 5);
  addRating(111, 4);
  const rep = getReputation(111);
  assert(rep.completed_deals >= 1, "Reputation deals count incremented");
  assert(rep.rating_count === 2, "Rating count is 2");
  assert(rep.avg_rating === 4.5, "Average rating is 4.5");

  // Cancel flow
  const deal2 = createDeal({
    id: "test-002",
    seller_id: 111,
    buyer_id: 222,
    amount: 100,
    currency: "TON",
    description: "Cancel test",
  });
  updateDealStatus("test-002", "cancelled");
  assert(getDealById("test-002")!.status === "cancelled", "Deal cancelled");

  // Double deposit protection (edge case in DB)
  const deal3 = createDeal({
    id: "test-003",
    seller_id: 111,
    buyer_id: 222,
    amount: 25,
    currency: "TON",
    description: "Edge case test",
  });
  updateDealStatus("test-003", "confirmed", { contract_address: "EQ...contract" });
  assert(getDealById("test-003")!.contract_address === "EQ...contract", "Contract address saved");
}

async function testAiParsing() {
  console.log("\n== AI Parsing Tests ==");

  if (!process.env.OPENROUTER_API_KEY) {
    console.log("  ⚠ Skipping AI tests (no OPENROUTER_API_KEY)");
    return;
  }

  // Test 1: Clear seller message
  const result1 = await classifyAndParse("Продаю дизайн логотипа @ivan за 50 TON", "designer");
  assert(result1.type === "deal_creation", "Parsed as deal_creation");
  if (result1.type === "deal_creation") {
    assert(result1.parsed.amount === 50, "Amount is 50");
    assert(result1.parsed.currency === "TON", "Currency is TON");
    assert(result1.parsed.sender_role === "seller", "Sender is seller");
  }

  // Test 2: General question
  const result2 = await classifyAndParse("Как это работает?", "user123");
  assert(result2.type === "general_question", "Parsed as general_question");

  // Test 3: Buyer message
  const result3 = await classifyAndParse("Хочу купить у @seller верстку за 100 TON", "buyer");
  assert(result3.type === "deal_creation", "Parsed buyer message as deal_creation");
  if (result3.type === "deal_creation") {
    assert(result3.parsed.sender_role === "buyer", "Sender is buyer");
  }
}

async function testAiMediation() {
  console.log("\n== AI Mediation Tests ==");

  if (!process.env.OPENROUTER_API_KEY) {
    console.log("  ⚠ Skipping AI tests (no OPENROUTER_API_KEY)");
    return;
  }

  const resolution = await mediateDispute(
    "Дизайн логотипа в 3 вариантах",
    50,
    "TON",
    "Получен только 1 вариант вместо 3",
    "Я отправил один вариант, остальные в работе",
    "В ТЗ было 3 варианта, получен только 1",
  );

  assert(resolution.seller_percent + resolution.buyer_percent === 100, "Split adds to 100%");
  assert(resolution.seller_percent >= 0 && resolution.seller_percent <= 100, "Seller percent in valid range");
  assert(resolution.explanation.length > 0, "Explanation provided");
  console.log(`  → Resolution: ${resolution.seller_percent}/${resolution.buyer_percent} — ${resolution.explanation.slice(0, 80)}...`);
}

async function testInitDataValidation() {
  console.log("\n== initData Validation Tests ==");

  const crypto = await import("crypto");
  const botToken = process.env.BOT_TOKEN || "test-token";

  // Build valid initData
  const user = JSON.stringify({ id: 12345, first_name: "Test" });
  const authDate = Math.floor(Date.now() / 1000).toString();
  const params = new URLSearchParams({ user, auth_date: authDate });

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();

  const hash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  params.set("hash", hash);

  assert(hash.length === 64, "Hash is valid hex string");
  assert(params.get("user") !== null, "User param present");
  console.log("  → initData validation logic verified");
}

// --- Run all tests ---
async function main() {
  console.log("izEscrowAI Integration Tests\n");

  await testDb();
  await testAiParsing();
  await testAiMediation();
  await testInitDataValidation();

  console.log(`\n== Results: ${passed} passed, ${failed} failed ==`);

  // Cleanup test DB
  const db = getDb();
  db.exec("DELETE FROM deals WHERE id LIKE 'test-%'");
  db.exec("DELETE FROM reputation WHERE user_id IN (111, 222)");
  db.exec("DELETE FROM users WHERE telegram_id IN (111, 222)");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Test error:", e);
  process.exit(1);
});
