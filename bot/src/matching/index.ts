// SPDX-License-Identifier: AGPL-3.0-only
// AI Matching: find and rank executors for a spec

import {
  getUsersByCategories,
  getDetailedReputation,
  getUserTrustScore,
  type Spec,
  type UserProfile,
} from "../db/index.js";

export interface MatchedExecutor {
  user_id: number;
  match_score: number;
  trust_score: number;
  avg_rating: number;
  completed_deals: number;
  categories: string[];
  recommended_price: number | null;
}

/**
 * Find and rank executors matching a spec (7.3, 7.4)
 */
export async function findMatchingExecutors(spec: Spec): Promise<MatchedExecutor[]> {
  const specCategory = spec.category;
  if (!specCategory) return [];

  const profiles = await getUsersByCategories([specCategory]);
  if (profiles.length === 0) return [];

  const results: MatchedExecutor[] = [];

  for (const profile of profiles) {
    // Skip the spec creator
    if (profile.user_id === spec.creator_id) continue;

    const rep = await getDetailedReputation(profile.user_id);
    const trustScore = await getUserTrustScore(profile.user_id);
    const avgRating = rep.rating_count > 0 ? rep.total_rating / rep.rating_count : 0;

    // Category match: 100 if category is in profile, 0 otherwise
    const categoryMatch = (profile.categories ?? []).includes(specCategory) ? 100 : 0;

    // Reputation normalized to 0-100
    const reputationNormalized = Math.min(100, avgRating * 20);

    // Trust normalized to 0-100 (already is)
    const trustNormalized = trustScore;

    // Price fit: 100 if budget exists and executor has deals, scale by experience
    let priceFit = 50; // neutral default
    if (spec.budget_min != null && spec.budget_max != null) {
      // More experienced = better price fit
      priceFit = Math.min(100, rep.completed_deals * 10 + 30);
    }

    // Match score: category_match * 0.3 + reputation * 0.3 + trust * 0.2 + price_fit * 0.2
    const matchScore = Math.round(
      categoryMatch * 0.3 +
      reputationNormalized * 0.3 +
      trustNormalized * 0.2 +
      priceFit * 0.2
    );

    // Personalized price recommendation (7.4)
    let recommendedPrice: number | null = null;
    if (spec.budget_min != null && spec.budget_max != null) {
      const range = spec.budget_max - spec.budget_min;
      // High-rated executors get higher price, new executors get lower
      const pricePosition = rep.completed_deals >= 3 && avgRating >= 4.5
        ? 0.7 + (avgRating - 4.5) * 0.6  // upper range
        : rep.completed_deals < 3
          ? 0.2 + rep.completed_deals * 0.1  // lower range
          : 0.3 + (avgRating / 5) * 0.4;  // middle range

      recommendedPrice = Math.round(spec.budget_min + range * Math.min(1, pricePosition));
    }

    results.push({
      user_id: profile.user_id,
      match_score: matchScore,
      trust_score: trustScore,
      avg_rating: avgRating,
      completed_deals: rep.completed_deals,
      categories: profile.categories ?? [],
      recommended_price: recommendedPrice,
    });
  }

  // Sort by match score descending, return top 5
  results.sort((a, b) => b.match_score - a.match_score);
  return results.slice(0, 5);
}

/**
 * Format matched executors for display (7.6)
 */
export function formatMatchResults(matches: MatchedExecutor[], currency: string): string {
  if (matches.length === 0) {
    return "No matching executors found.";
  }

  const lines = matches.map((m, i) => {
    const badge = m.completed_deals === 0 ? "🆕"
      : m.trust_score >= 70 ? "🟢" : m.trust_score >= 40 ? "🟡" : "🔴";
    const price = m.recommended_price ? `${m.recommended_price} ${currency}` : "—";
    return `${i + 1}. ${badge} Trust: ${m.trust_score} | Rating: ${m.avg_rating.toFixed(1)} | Deals: ${m.completed_deals}\n   Match: ${m.match_score}% | Suggested price: ${price}`;
  });

  return `Top Executors:\n\n${lines.join("\n\n")}`;
}
