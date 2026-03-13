// SPDX-License-Identifier: AGPL-3.0-only
// Trust Score module — new formula from design.md
//
// trust_score = min(100, base + deals_bonus + rating_bonus + wallet_bonus + age_bonus - dispute_penalty)
//   base            = 10
//   deals_bonus     = min(30, completed_deals * 3)
//   rating_bonus    = min(25, avg_rating * 5)
//   wallet_bonus    = 10  (if wallet connected)
//   age_bonus       = min(15, days_since_first_deal * 0.5)
//   dispute_penalty = disputes_lost * 10

import {
  getDetailedReputation,
  getUserWallet,
  getUserFirstDealAt,
  updateUserTrustScore,
} from "../db/index.js";

// ── Score Breakdown ────────────────────────────────────────────────

export interface TrustScoreBreakdown {
  total: number;
  base: number;
  deals_bonus: number;
  rating_bonus: number;
  wallet_bonus: number;
  age_bonus: number;
  dispute_penalty: number;
  completed_deals: number;
}

// ── Core Calculation ───────────────────────────────────────────────

/**
 * Calculate a user's trust score using the design-doc formula.
 * Returns a score clamped to 0-100.
 */
export async function calculateTrustScore(userId: number): Promise<number> {
  const breakdown = await calculateTrustScoreBreakdown(userId);
  return breakdown.total;
}

/**
 * Calculate trust score with a full breakdown of every component.
 */
export async function calculateTrustScoreBreakdown(
  userId: number,
): Promise<TrustScoreBreakdown> {
  const [rep, wallet, firstDealAt] = await Promise.all([
    getDetailedReputation(userId),
    getUserWallet(userId),
    getUserFirstDealAt(userId),
  ]);

  const base = 10;
  const deals_bonus = Math.min(30, rep.completed_deals * 3);
  const rating_bonus = Math.min(25, rep.avg_rating * 5);
  const wallet_bonus = wallet ? 10 : 0;

  let age_bonus = 0;
  if (firstDealAt) {
    const firstDealDate = new Date(firstDealAt);
    const daysSinceFirstDeal =
      (Date.now() - firstDealDate.getTime()) / (1000 * 60 * 60 * 24);
    age_bonus = Math.min(15, daysSinceFirstDeal * 0.5);
  }

  const dispute_penalty = rep.disputes_lost * 10;

  const raw = base + deals_bonus + rating_bonus + wallet_bonus + age_bonus - dispute_penalty;
  const total = Math.round(Math.min(100, Math.max(0, raw)));

  return {
    total,
    base,
    deals_bonus,
    rating_bonus,
    wallet_bonus,
    age_bonus: Math.round(age_bonus * 10) / 10, // one decimal
    dispute_penalty,
    completed_deals: rep.completed_deals,
  };
}

// ── Recalculate & Persist ──────────────────────────────────────────

/**
 * Recalculate a user's trust score and persist it to the DB.
 * Returns the new score.
 */
export async function recalculateTrustScore(userId: number): Promise<number> {
  const score = await calculateTrustScore(userId);
  await updateUserTrustScore(userId, score);
  return score;
}

// ── Formatting Helpers ─────────────────────────────────────────────

/**
 * Return a coloured badge string for the given trust score.
 *
 * Examples: "🟢 85", "🟡 55", "🔴 20", "🆕 New"
 */
export function formatTrustBadge(score: number, completedDeals: number): string {
  if (completedDeals === 0) return "\u{1F195} New";      // 🆕
  if (score >= 70)          return `\u{1F7E2} ${score}`;  // 🟢
  if (score >= 40)          return `\u{1F7E1} ${score}`;  // 🟡
  return `\u{1F534} ${score}`;                            // 🔴
}

/**
 * Build a human-readable breakdown of a user's trust score
 * for the /score command.
 */
export async function formatTrustBreakdown(userId: number): Promise<string> {
  const b = await calculateTrustScoreBreakdown(userId);
  const badge = formatTrustBadge(b.total, b.completed_deals);

  const lines = [
    `Trust Score: ${badge}`,
    ``,
    `Base:             +${b.base}`,
    `Deals bonus:      +${b.deals_bonus}  (${b.completed_deals} deals)`,
    `Rating bonus:     +${b.rating_bonus.toFixed(1)}`,
    `Wallet bonus:     +${b.wallet_bonus}  ${b.wallet_bonus ? "(connected)" : "(not connected)"}`,
    `Age bonus:        +${b.age_bonus.toFixed(1)}`,
    `Dispute penalty:  -${b.dispute_penalty}`,
    `────────────────────`,
    `Total:             ${b.total}/100`,
  ];

  return lines.join("\n");
}
