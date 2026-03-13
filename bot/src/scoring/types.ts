// SPDX-License-Identifier: AGPL-3.0-only

export interface TrustScoreWeights {
  rating: number;       // weight for avg rating component
  deals: number;        // weight for completed deals component
  disputeFree: number;  // weight for dispute-free rate
  speed: number;        // weight for completion speed
  repeats: number;      // weight for repeat clients
}

export interface ScoringWeightsConfig {
  trustScoreWeights: TrustScoreWeights;
  minDealsForScore: number; // minimum deals before a score is calculated
}
