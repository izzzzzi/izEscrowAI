import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "../../data.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = OFF");
    migrate(db);
  }
  return db;
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      telegram_id INTEGER PRIMARY KEY,
      username TEXT,
      wallet_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      seller_id INTEGER NOT NULL REFERENCES users(telegram_id),
      buyer_id INTEGER NOT NULL REFERENCES users(telegram_id),
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'TON',
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'created',
      contract_address TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      delivered_at TEXT,
      timeout_at TEXT
    );

    CREATE TABLE IF NOT EXISTS reputation (
      user_id INTEGER PRIMARY KEY REFERENCES users(telegram_id),
      completed_deals INTEGER NOT NULL DEFAULT 0,
      total_rating INTEGER NOT NULL DEFAULT 0,
      rating_count INTEGER NOT NULL DEFAULT 0
    );
  `);
}

// --- Users ---

export function upsertUser(telegramId: number, username?: string) {
  const db = getDb();
  db.prepare(`
    INSERT INTO users (telegram_id, username)
    VALUES (?, ?)
    ON CONFLICT(telegram_id) DO UPDATE SET username = excluded.username
  `).run(telegramId, username ?? null);
}

export function getUserByUsername(username: string): { telegram_id: number; username: string } | null {
  const db = getDb();
  const row = db
    .prepare("SELECT telegram_id, username FROM users WHERE username = ?")
    .get(username) as { telegram_id: number; username: string } | undefined;
  return row ?? null;
}

export function getUserWallet(telegramId: number): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT wallet_address FROM users WHERE telegram_id = ?")
    .get(telegramId) as { wallet_address: string | null } | undefined;
  return row?.wallet_address ?? null;
}

export function setUserWallet(telegramId: number, wallet: string) {
  const db = getDb();
  db.prepare("UPDATE users SET wallet_address = ? WHERE telegram_id = ?").run(
    wallet,
    telegramId,
  );
}

// --- Deals ---

export type DealStatus =
  | "created"
  | "confirmed"
  | "funded"
  | "delivered"
  | "completed"
  | "disputed"
  | "resolved"
  | "expired"
  | "cancelled";

export interface Deal {
  id: string;
  seller_id: number;
  buyer_id: number;
  amount: number;
  currency: string;
  description: string;
  status: DealStatus;
  contract_address: string | null;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  timeout_at: string | null;
}

export function createDeal(deal: {
  id: string;
  seller_id: number;
  buyer_id: number;
  amount: number;
  currency: string;
  description: string;
}): Deal {
  const db = getDb();
  db.prepare(`
    INSERT INTO deals (id, seller_id, buyer_id, amount, currency, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(deal.id, deal.seller_id, deal.buyer_id, deal.amount, deal.currency, deal.description);
  return getDealById(deal.id)!;
}

export function getDealById(id: string): Deal | null {
  const db = getDb();
  return (db.prepare("SELECT * FROM deals WHERE id = ?").get(id) as Deal) ?? null;
}

export function getDealsByUser(telegramId: number): Deal[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM deals WHERE seller_id = ? OR buyer_id = ? ORDER BY created_at DESC",
    )
    .all(telegramId, telegramId) as Deal[];
}

export function getActiveDeals(): Deal[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM deals WHERE status NOT IN ('completed', 'resolved', 'expired', 'cancelled')",
    )
    .all() as Deal[];
}

export function updateDealParty(id: string, field: "seller_id" | "buyer_id", telegramId: number) {
  const db = getDb();
  db.prepare(`UPDATE deals SET ${field} = ?, updated_at = datetime('now') WHERE id = ?`).run(telegramId, id);
}

export function updateDealStatus(id: string, status: DealStatus, extra?: Partial<Deal>) {
  const db = getDb();
  const sets = ["status = ?", "updated_at = datetime('now')"];
  const params: unknown[] = [status];

  if (extra?.contract_address !== undefined) {
    sets.push("contract_address = ?");
    params.push(extra.contract_address);
  }
  if (extra?.delivered_at !== undefined) {
    sets.push("delivered_at = ?");
    params.push(extra.delivered_at);
  }
  if (extra?.timeout_at !== undefined) {
    sets.push("timeout_at = ?");
    params.push(extra.timeout_at);
  }

  params.push(id);
  db.prepare(`UPDATE deals SET ${sets.join(", ")} WHERE id = ?`).run(...params);
}

// --- Reputation ---

export interface Reputation {
  completed_deals: number;
  total_rating: number;
  rating_count: number;
  avg_rating: number;
}

export function getReputation(telegramId: number): Reputation {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM reputation WHERE user_id = ?")
    .get(telegramId) as { completed_deals: number; total_rating: number; rating_count: number } | undefined;

  if (!row) {
    return { completed_deals: 0, total_rating: 0, rating_count: 0, avg_rating: 0 };
  }
  return {
    ...row,
    avg_rating: row.rating_count > 0 ? row.total_rating / row.rating_count : 0,
  };
}

export function incrementDeals(telegramId: number) {
  const db = getDb();
  db.prepare(`
    INSERT INTO reputation (user_id, completed_deals)
    VALUES (?, 1)
    ON CONFLICT(user_id) DO UPDATE SET completed_deals = completed_deals + 1
  `).run(telegramId);
}

export function addRating(telegramId: number, rating: number) {
  const db = getDb();
  db.prepare(`
    INSERT INTO reputation (user_id, total_rating, rating_count)
    VALUES (?, ?, 1)
    ON CONFLICT(user_id) DO UPDATE SET
      total_rating = total_rating + ?,
      rating_count = rating_count + 1
  `).run(telegramId, rating, rating);
}
