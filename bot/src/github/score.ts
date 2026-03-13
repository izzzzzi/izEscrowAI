import type { FetchedGithubProfile } from "./index.js";

export interface GithubFlags {
  green: string[];
  red: string[];
}

/**
 * Detect red and green flags for fake/trust signals
 * GTS-2 spec
 */
export function detectFlags(profile: FetchedGithubProfile): GithubFlags {
  const red: string[] = [];
  const green: string[] = [];

  const ageMs = Date.now() - profile.account_created_at.getTime();
  const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30);

  // Red flags
  if (ageMonths < 3) {
    red.push("new_account");
  }
  if (profile.all_forks) {
    red.push("all_forks");
  }
  if (profile.total_commits_year === 0 && profile.public_repos > 5) {
    red.push("empty_activity");
  }
  // burst_activity: >80% events in last 7 days for accounts >6 months
  // We approximate with total_commits_year — if very high but account is old, flag it
  // Since we only have yearly commits count, we skip precise burst detection

  // Green flags
  if (ageMonths >= 36) {
    green.push("established");
  }
  if (profile.total_stars >= 5) {
    green.push("starred_repos");
  }
  if (profile.has_external_prs) {
    green.push("external_prs");
  }
  if (profile.orgs_count >= 1) {
    green.push("org_member");
  }

  return { green, red };
}

/**
 * Calculate GitHub Score (0-100) from profile data
 * GTS-1 formula: Age 20% + Activity 25% + Quality 20% + Relevance 25% + Social 10%
 */
export function calcGithubScore(profile: FetchedGithubProfile): number {
  // 1. Account Age (max 20)
  const ageMs = Date.now() - profile.account_created_at.getTime();
  const ageMonths = ageMs / (1000 * 60 * 60 * 24 * 30);
  let ageScore: number;
  if (ageMonths < 3) ageScore = 0;
  else if (ageMonths < 6) ageScore = 5;
  else if (ageMonths < 12) ageScore = 10;
  else if (ageMonths < 36) ageScore = 15;
  else ageScore = 20;

  // 2. Activity Consistency (max 25)
  // contribution_count / 365 capped at 1.0
  const activityRatio = Math.min(1, profile.total_commits_year / 365);
  const activityScore = activityRatio * 25;

  // 3. Repo Quality (max 20)
  // raw = total_stars + total_forks * 2
  const raw = profile.total_stars + profile.total_forks * 2;
  const qualityScore = Math.min(20, Math.log2(raw + 1) * 3);

  // 4. Skill Relevance (max 25) — no deal context, use language count
  const languageCount = Object.keys(profile.languages).length;
  const relevanceScore = Math.min(25, languageCount * 5);

  // 5. Social Proof (max 10)
  const followerScore = Math.min(5, Math.log2(profile.followers + 1) * 2);
  const orgScore = Math.min(5, profile.orgs_count * 2.5);
  const socialScore = Math.min(10, followerScore + orgScore);

  const total = ageScore + activityScore + qualityScore + relevanceScore + socialScore;
  return Math.round(Math.min(100, Math.max(0, total)));
}
