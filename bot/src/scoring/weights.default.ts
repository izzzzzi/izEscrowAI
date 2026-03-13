// SPDX-License-Identifier: AGPL-3.0-only
// This is the public default config. Create weights.ts (gitignored) for your private weights.

import type { ScoringWeightsConfig } from "./types.js";

const config: ScoringWeightsConfig = {
  trustScoreWeights: {
    rating: 0.30,       // 30% — avg rating scaled 0-5 to 0-100
    deals: 0.25,        // 25% — completed deals (logarithmic, caps ~50)
    disputeFree: 0.20,  // 20% — dispute-free rate
    speed: 0.15,        // 15% — avg completion speed (1 day = 100, 30+ days = 0)
    repeats: 0.10,      // 10% — repeat clients (logarithmic)
  },
  minDealsForScore: 3,  // "New user" if < 3 completed deals
};

export default config;
