import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, or, notInArray, inArray, sql, and, desc, count, gte, lte } from "drizzle-orm";
import { users, deals, reputation, offers, applications, riskAssessments, groupStats, dealGroups, githubProfiles, sources, parsedJobs, platformSettings, jobResponses } from "./schema.js";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: pg.Pool | null = null;

export function getDb() {
  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error("DATABASE_URL is required");
      process.exit(1);
    }
    _pool = new pg.Pool({ connectionString: databaseUrl });
    _db = drizzle(_pool);
  }
  return _db;
}

export async function closeDb() {
  if (_pool) {
    await _pool.end();
    _pool = null;
    _db = null;
  }
}

export async function runSearchSetup() {
  const db = getDb();
  await db.execute(sql`
    ALTER TABLE offers
    ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', description)) STORED
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS offers_search_vector_idx
    ON offers USING GIN (search_vector)
  `);
}

// --- Users ---

export async function upsertUser(telegramId: number, username?: string) {
  const db = getDb();
  await db.insert(users)
    .values({ telegram_id: telegramId, username: username ?? null })
    .onConflictDoUpdate({
      target: users.telegram_id,
      set: { username: username ?? null },
    });
}

export async function getUserByUsername(username: string): Promise<{ telegram_id: number; username: string } | null> {
  const db = getDb();
  const rows = await db.select({ telegram_id: users.telegram_id, username: users.username })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);
  const row = rows[0];
  if (!row || !row.username) return null;
  return { telegram_id: row.telegram_id, username: row.username };
}

export async function getUserWallet(telegramId: number): Promise<string | null> {
  const db = getDb();
  const rows = await db.select({ wallet_address: users.wallet_address })
    .from(users)
    .where(eq(users.telegram_id, telegramId))
    .limit(1);
  return rows[0]?.wallet_address ?? null;
}

export async function setUserWallet(telegramId: number, wallet: string) {
  const db = getDb();
  await db.update(users)
    .set({ wallet_address: wallet })
    .where(eq(users.telegram_id, telegramId));
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
  original_amount: number | null;
  original_currency: string | null;
  exchange_rate: number | null;
  rate_expires_at: number | null;
}

function toDeal(row: any): Deal {
  return {
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    delivered_at: row.delivered_at instanceof Date ? row.delivered_at.toISOString() : row.delivered_at,
    timeout_at: row.timeout_at instanceof Date ? row.timeout_at.toISOString() : row.timeout_at,
  };
}

export async function createDeal(deal: {
  id: string;
  seller_id: number;
  buyer_id: number;
  amount: number;
  currency: string;
  description: string;
  original_amount?: number;
  original_currency?: string;
  exchange_rate?: number;
  rate_expires_at?: number;
}): Promise<Deal> {
  const db = getDb();
  await db.insert(deals).values({
    id: deal.id,
    seller_id: deal.seller_id,
    buyer_id: deal.buyer_id,
    amount: deal.amount,
    currency: deal.currency,
    description: deal.description,
    original_amount: deal.original_amount ?? null,
    original_currency: deal.original_currency ?? null,
    exchange_rate: deal.exchange_rate ?? null,
    rate_expires_at: deal.rate_expires_at ?? null,
  });
  return (await getDealById(deal.id))!;
}

export async function getDealById(id: string): Promise<Deal | null> {
  const db = getDb();
  const rows = await db.select().from(deals).where(eq(deals.id, id)).limit(1);
  return rows[0] ? toDeal(rows[0]) : null;
}

export async function getDealsByUser(telegramId: number): Promise<Deal[]> {
  const db = getDb();
  const rows = await db.select().from(deals)
    .where(or(eq(deals.seller_id, telegramId), eq(deals.buyer_id, telegramId)))
    .orderBy(desc(deals.created_at));
  return rows.map(toDeal);
}

export async function getActiveDeals(): Promise<Deal[]> {
  const db = getDb();
  const rows = await db.select().from(deals)
    .where(notInArray(deals.status, ["completed", "resolved", "expired", "cancelled"]));
  return rows.map(toDeal);
}

export async function updateDealParty(id: string, field: "seller_id" | "buyer_id", telegramId: number) {
  const db = getDb();
  await db.update(deals)
    .set({ [field]: telegramId, updated_at: sql`now()` })
    .where(eq(deals.id, id));
}

export async function updateDealStatus(id: string, status: DealStatus, extra?: Partial<Deal>) {
  const db = getDb();
  const set: Record<string, unknown> = { status, updated_at: sql`now()` };
  if (extra?.contract_address !== undefined) set.contract_address = extra.contract_address;
  if (extra?.delivered_at !== undefined) set.delivered_at = extra.delivered_at;
  if (extra?.timeout_at !== undefined) set.timeout_at = extra.timeout_at;
  await db.update(deals).set(set).where(eq(deals.id, id));
}

export async function updateDealRate(id: string, amount: number, exchangeRate: number, rateExpiresAt: number) {
  const db = getDb();
  await db.update(deals)
    .set({ amount, exchange_rate: exchangeRate, rate_expires_at: rateExpiresAt, updated_at: sql`now()` })
    .where(eq(deals.id, id));
}

// --- Reputation ---

export interface Reputation {
  completed_deals: number;
  total_rating: number;
  rating_count: number;
  avg_rating: number;
}

export async function getReputation(telegramId: number): Promise<Reputation> {
  const db = getDb();
  const rows = await db.select().from(reputation).where(eq(reputation.user_id, telegramId)).limit(1);
  const row = rows[0];
  if (!row) {
    return { completed_deals: 0, total_rating: 0, rating_count: 0, avg_rating: 0 };
  }
  return {
    completed_deals: row.completed_deals,
    total_rating: row.total_rating,
    rating_count: row.rating_count,
    avg_rating: row.rating_count > 0 ? row.total_rating / row.rating_count : 0,
  };
}

export async function incrementDeals(telegramId: number) {
  const db = getDb();
  await db.insert(reputation)
    .values({ user_id: telegramId, completed_deals: 1 })
    .onConflictDoUpdate({
      target: reputation.user_id,
      set: { completed_deals: sql`${reputation.completed_deals} + 1` },
    });
}

export async function addRating(telegramId: number, rating: number) {
  const db = getDb();
  await db.insert(reputation)
    .values({ user_id: telegramId, total_rating: rating, rating_count: 1 })
    .onConflictDoUpdate({
      target: reputation.user_id,
      set: {
        total_rating: sql`${reputation.total_rating} + ${rating}`,
        rating_count: sql`${reputation.rating_count} + 1`,
      },
    });
}

// --- Offers ---

export interface Offer {
  id: string;
  creator_id: number;
  description: string;
  min_price: number | null;
  currency: string;
  role: string;
  status: string;
  deal_id: string | null;
  max_applicants: number | null;
  inline_message_id: string | null;
  created_at: string;
}

function toOffer(row: any): Offer {
  return {
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

export async function createOffer(offer: {
  id: string;
  creator_id: number;
  description: string;
  min_price?: number;
  currency?: string;
  role?: string;
}): Promise<Offer> {
  const db = getDb();
  await db.insert(offers).values({
    id: offer.id,
    creator_id: offer.creator_id,
    description: offer.description,
    min_price: offer.min_price ?? null,
    currency: offer.currency ?? "TON",
    role: offer.role ?? "buyer",
  });
  return (await getOfferById(offer.id))!;
}

export async function getOfferById(id: string): Promise<Offer | null> {
  const db = getDb();
  const rows = await db.select().from(offers).where(eq(offers.id, id)).limit(1);
  return rows[0] ? toOffer(rows[0]) : null;
}

export async function getOffersByUser(creatorId: number): Promise<Offer[]> {
  const db = getDb();
  const rows = await db.select().from(offers)
    .where(eq(offers.creator_id, creatorId))
    .orderBy(desc(offers.created_at));
  return rows.map(toOffer);
}

export async function getOpenOffers(): Promise<Offer[]> {
  const db = getDb();
  const rows = await db.select().from(offers)
    .where(eq(offers.status, "open"))
    .orderBy(desc(offers.created_at));
  return rows.map(toOffer);
}

export async function closeOffer(id: string, dealId: string) {
  const db = getDb();
  await db.update(offers)
    .set({ status: "closed", deal_id: dealId })
    .where(eq(offers.id, id));
}

export async function searchOffers(query: string): Promise<Offer[]> {
  const db = getDb();
  const rows = await db.select().from(offers)
    .where(and(
      eq(offers.status, "open"),
      sql`search_vector @@ plainto_tsquery('english', ${query})`,
    ))
    .orderBy(sql`ts_rank(search_vector, plainto_tsquery('english', ${query})) DESC`)
    .limit(20);
  return rows.map(toOffer);
}

export async function cancelOffer(id: string) {
  const db = getDb();
  await db.update(offers)
    .set({ status: "cancelled" })
    .where(eq(offers.id, id));
}

export async function updateOfferInlineMessageId(id: string, inlineMessageId: string) {
  const db = getDb();
  await db.update(offers)
    .set({ inline_message_id: inlineMessageId })
    .where(eq(offers.id, id));
}

// --- Applications ---

export interface Application {
  id: string;
  offer_id: string;
  user_id: number;
  price: number;
  message: string | null;
  status: string;
  created_at: string;
}

function toApplication(row: any): Application {
  return {
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

export async function addApplication(app: {
  id: string;
  offer_id: string;
  user_id: number;
  price: number;
  message?: string;
}): Promise<Application> {
  const db = getDb();
  await db.insert(applications)
    .values({
      id: app.id,
      offer_id: app.offer_id,
      user_id: app.user_id,
      price: app.price,
      message: app.message ?? null,
    })
    .onConflictDoUpdate({
      target: [applications.offer_id, applications.user_id],
      set: {
        price: sql`excluded.price`,
        message: sql`excluded.message`,
        status: "pending",
      },
    });
  const result = await getApplicationById(app.id);
  if (result) return result;
  const apps = await getApplicationsByOffer(app.offer_id);
  return apps.find(a => a.user_id === app.user_id)!;
}

export async function getApplicationsByOffer(offerId: string): Promise<Application[]> {
  const db = getDb();
  const rows = await db.select().from(applications)
    .where(eq(applications.offer_id, offerId))
    .orderBy(desc(applications.created_at));
  return rows.map(toApplication);
}

export async function getApplicationsByUser(userId: number): Promise<Application[]> {
  const db = getDb();
  const rows = await db.select().from(applications)
    .where(eq(applications.user_id, userId))
    .orderBy(desc(applications.created_at));
  return rows.map(toApplication);
}

export async function getApplicationById(id: string): Promise<Application | null> {
  const db = getDb();
  const rows = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
  return rows[0] ? toApplication(rows[0]) : null;
}

export async function acceptApplication(id: string) {
  const db = getDb();
  await db.update(applications)
    .set({ status: "accepted" })
    .where(eq(applications.id, id));
}

export async function rejectAllApplications(offerId: string, exceptId?: string) {
  const db = getDb();
  if (exceptId) {
    await db.update(applications)
      .set({ status: "rejected" })
      .where(and(eq(applications.offer_id, offerId), sql`${applications.id} != ${exceptId}`));
  } else {
    await db.update(applications)
      .set({ status: "rejected" })
      .where(eq(applications.offer_id, offerId));
  }
}

export async function countApplicationsByOffer(offerId: string): Promise<number> {
  const db = getDb();
  const rows = await db.select({ count: sql<number>`count(*)` })
    .from(applications)
    .where(eq(applications.offer_id, offerId));
  return Number(rows[0]?.count ?? 0);
}

// --- Risk Assessments ---

export interface RiskAssessment {
  user_id: number;
  score: number;
  level: string;
  factors: string[];
  assessed_at: string;
}

function toRiskAssessment(row: any): RiskAssessment {
  return {
    ...row,
    factors: typeof row.factors === "string" ? JSON.parse(row.factors) : row.factors,
    assessed_at: row.assessed_at instanceof Date ? row.assessed_at.toISOString() : row.assessed_at,
  };
}

export async function saveRiskAssessment(assessment: {
  user_id: number;
  score: number;
  level: string;
  factors: string[] | string;
}) {
  const db = getDb();
  const factorsValue = Array.isArray(assessment.factors) ? assessment.factors : JSON.parse(assessment.factors);
  await db.insert(riskAssessments)
    .values({
      user_id: assessment.user_id,
      score: assessment.score,
      level: assessment.level,
      factors: factorsValue,
    })
    .onConflictDoUpdate({
      target: riskAssessments.user_id,
      set: {
        score: assessment.score,
        level: assessment.level,
        factors: factorsValue,
        assessed_at: sql`now()`,
      },
    });
}

export async function getRiskAssessment(userId: number): Promise<RiskAssessment | null> {
  const db = getDb();
  const rows = await db.select().from(riskAssessments).where(eq(riskAssessments.user_id, userId)).limit(1);
  return rows[0] ? toRiskAssessment(rows[0]) : null;
}

export async function isRiskStale(userId: number): Promise<boolean> {
  const assessment = await getRiskAssessment(userId);
  if (!assessment) return true;
  const assessedAt = new Date(assessment.assessed_at).getTime();
  const dayInMs = 24 * 60 * 60 * 1000;
  return Date.now() - assessedAt > dayInMs;
}

// --- Extended Reputation ---

export interface DetailedReputation extends Reputation {
  avg_completion_days: number | null;
  cancelled_deals: number;
  disputes_opened: number;
  disputes_lost: number;
  repeat_clients: number;
  last_active_at: string | null;
}

export async function getDetailedReputation(telegramId: number): Promise<DetailedReputation> {
  const db = getDb();
  const rows = await db.select().from(reputation).where(eq(reputation.user_id, telegramId)).limit(1);
  const row = rows[0];
  if (!row) {
    return {
      completed_deals: 0, total_rating: 0, rating_count: 0, avg_rating: 0,
      avg_completion_days: null, cancelled_deals: 0, disputes_opened: 0,
      disputes_lost: 0, repeat_clients: 0, last_active_at: null,
    };
  }
  return {
    completed_deals: row.completed_deals,
    total_rating: row.total_rating,
    rating_count: row.rating_count,
    avg_rating: row.rating_count > 0 ? row.total_rating / row.rating_count : 0,
    avg_completion_days: row.avg_completion_days,
    cancelled_deals: row.cancelled_deals,
    disputes_opened: row.disputes_opened,
    disputes_lost: row.disputes_lost,
    repeat_clients: row.repeat_clients,
    last_active_at: row.last_active_at instanceof Date ? row.last_active_at.toISOString() : row.last_active_at,
  };
}

export async function updateCompletionTime(telegramId: number, days: number) {
  const db = getDb();
  const rep = await getDetailedReputation(telegramId);
  const totalDeals = rep.completed_deals || 1;
  const currentAvg = rep.avg_completion_days ?? days;
  const newAvg = (currentAvg * (totalDeals - 1) + days) / totalDeals;
  await db.insert(reputation)
    .values({ user_id: telegramId, avg_completion_days: newAvg })
    .onConflictDoUpdate({
      target: reputation.user_id,
      set: { avg_completion_days: newAvg },
    });
}

export async function incrementCancelled(telegramId: number) {
  const db = getDb();
  await db.insert(reputation)
    .values({ user_id: telegramId, cancelled_deals: 1 })
    .onConflictDoUpdate({
      target: reputation.user_id,
      set: { cancelled_deals: sql`${reputation.cancelled_deals} + 1` },
    });
}

export async function incrementDisputes(telegramId: number, field: "disputes_opened" | "disputes_lost") {
  const db = getDb();
  const col = field === "disputes_opened" ? reputation.disputes_opened : reputation.disputes_lost;
  await db.insert(reputation)
    .values({ user_id: telegramId, [field]: 1 })
    .onConflictDoUpdate({
      target: reputation.user_id,
      set: { [field]: sql`${col} + 1` },
    });
}

export async function trackRepeatClient(telegramId: number) {
  const db = getDb();
  await db.insert(reputation)
    .values({ user_id: telegramId, repeat_clients: 1 })
    .onConflictDoUpdate({
      target: reputation.user_id,
      set: { repeat_clients: sql`${reputation.repeat_clients} + 1` },
    });
}

export async function updateLastActive(telegramId: number) {
  const db = getDb();
  await db.insert(reputation)
    .values({ user_id: telegramId, last_active_at: sql`now()` })
    .onConflictDoUpdate({
      target: reputation.user_id,
      set: { last_active_at: sql`now()` },
    });
}

// --- Group Analytics ---

export interface GroupStat {
  group_id: number;
  title: string | null;
  username: string | null;
  member_count: number | null;
  bot_active: number;
  total_offers: number;
  completed_deals: number;
  total_volume: number;
  avg_check: number | null;
  conversion_rate: number | null;
  category: string | null;
  first_seen_at: string;
  last_activity_at: string | null;
}

function toGroupStat(row: any): GroupStat {
  return {
    ...row,
    first_seen_at: row.first_seen_at instanceof Date ? row.first_seen_at.toISOString() : row.first_seen_at,
    last_activity_at: row.last_activity_at instanceof Date ? row.last_activity_at.toISOString() : row.last_activity_at,
  };
}

export async function upsertGroup(groupId: number, title?: string, username?: string, memberCount?: number) {
  const db = getDb();
  await db.insert(groupStats)
    .values({
      group_id: groupId,
      title: title ?? null,
      username: username ?? null,
      member_count: memberCount ?? null,
    })
    .onConflictDoUpdate({
      target: groupStats.group_id,
      set: {
        title: title ?? sql`${groupStats.title}`,
        username: username ?? sql`${groupStats.username}`,
        member_count: memberCount ?? sql`${groupStats.member_count}`,
        bot_active: 1,
      },
    });
}

export async function setGroupInactive(groupId: number) {
  const db = getDb();
  await db.update(groupStats)
    .set({ bot_active: 0 })
    .where(eq(groupStats.group_id, groupId));
}

export async function getGroupStatsById(groupId: number): Promise<GroupStat | null> {
  const db = getDb();
  const rows = await db.select().from(groupStats).where(eq(groupStats.group_id, groupId)).limit(1);
  return rows[0] ? toGroupStat(rows[0]) : null;
}

export async function getLeaderboard(sortBy: "completed_deals" | "total_volume" | "avg_check" = "completed_deals", limit = 10): Promise<GroupStat[]> {
  const db = getDb();
  const col = sortBy === "total_volume" ? groupStats.total_volume
    : sortBy === "avg_check" ? groupStats.avg_check
    : groupStats.completed_deals;
  const rows = await db.select().from(groupStats)
    .where(eq(groupStats.bot_active, 1))
    .orderBy(desc(col))
    .limit(limit);
  return rows.map(toGroupStat);
}

export async function linkDealToGroup(dealId: string, groupId: number) {
  const db = getDb();
  await db.insert(dealGroups)
    .values({ deal_id: dealId, group_id: groupId })
    .onConflictDoNothing();
}

export async function incrementGroupOffers(groupId: number) {
  const db = getDb();
  await db.update(groupStats)
    .set({
      total_offers: sql`${groupStats.total_offers} + 1`,
      last_activity_at: sql`now()`,
    })
    .where(eq(groupStats.group_id, groupId));
}

export async function updateGroupStatsOnCompletion(groupId: number, dealAmount: number) {
  const db = getDb();
  // Update completed_deals, volume, avg_check, conversion_rate
  await db.update(groupStats)
    .set({
      completed_deals: sql`${groupStats.completed_deals} + 1`,
      total_volume: sql`${groupStats.total_volume} + ${dealAmount}`,
      avg_check: sql`(${groupStats.total_volume} + ${dealAmount}) / (${groupStats.completed_deals} + 1)`,
      conversion_rate: sql`CASE WHEN ${groupStats.total_offers} > 0 THEN (${groupStats.completed_deals} + 1)::real / ${groupStats.total_offers} ELSE NULL END`,
      last_activity_at: sql`now()`,
    })
    .where(eq(groupStats.group_id, groupId));
}

export async function getGroupsForDeal(dealId: string): Promise<number[]> {
  const db = getDb();
  const rows = await db.select({ group_id: dealGroups.group_id })
    .from(dealGroups)
    .where(eq(dealGroups.deal_id, dealId));
  return rows.map(r => r.group_id);
}

// --- GitHub Profiles ---

export interface GithubProfile {
  user_id: number;
  github_id: number;
  username: string;
  avatar_url: string | null;
  profile_url: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  account_created_at: string | null;
  languages: Record<string, number> | null;
  top_repos: Array<{ name: string; stars: number; forks: number; language: string | null }> | null;
  total_stars: number;
  total_forks: number;
  total_commits_year: number;
  orgs_count: number;
  github_score: number | null;
  flags: { green: string[]; red: string[] } | null;
  fetched_at: string;
  linked_at: string;
}

function toGithubProfile(row: any): GithubProfile {
  return {
    ...row,
    languages: row.languages ?? null,
    top_repos: row.top_repos ?? null,
    flags: row.flags ?? null,
    account_created_at: row.account_created_at instanceof Date ? row.account_created_at.toISOString() : row.account_created_at,
    fetched_at: row.fetched_at instanceof Date ? row.fetched_at.toISOString() : row.fetched_at,
    linked_at: row.linked_at instanceof Date ? row.linked_at.toISOString() : row.linked_at,
    // Never expose access_token
    access_token: undefined,
  };
}

export async function upsertGithubProfile(data: {
  user_id: number;
  github_id: number;
  username: string;
  avatar_url?: string;
  profile_url?: string;
  bio?: string;
  public_repos?: number;
  followers?: number;
  following?: number;
  account_created_at?: Date;
  languages?: Record<string, number>;
  top_repos?: Array<{ name: string; stars: number; forks: number; language: string | null }>;
  total_stars?: number;
  total_forks?: number;
  total_commits_year?: number;
  orgs_count?: number;
  github_score?: number;
  flags?: { green: string[]; red: string[] };
  access_token?: string;
}) {
  const db = getDb();
  await db.insert(githubProfiles)
    .values({
      user_id: data.user_id,
      github_id: data.github_id,
      username: data.username,
      avatar_url: data.avatar_url ?? null,
      profile_url: data.profile_url ?? null,
      bio: data.bio ?? null,
      public_repos: data.public_repos ?? 0,
      followers: data.followers ?? 0,
      following: data.following ?? 0,
      account_created_at: data.account_created_at ?? null,
      languages: data.languages ?? null,
      top_repos: data.top_repos ?? null,
      total_stars: data.total_stars ?? 0,
      total_forks: data.total_forks ?? 0,
      total_commits_year: data.total_commits_year ?? 0,
      orgs_count: data.orgs_count ?? 0,
      github_score: data.github_score ?? null,
      flags: data.flags ?? null,
      access_token: data.access_token ?? null,
    })
    .onConflictDoUpdate({
      target: githubProfiles.user_id,
      set: {
        github_id: data.github_id,
        username: data.username,
        avatar_url: data.avatar_url ?? null,
        profile_url: data.profile_url ?? null,
        bio: data.bio ?? null,
        public_repos: data.public_repos ?? 0,
        followers: data.followers ?? 0,
        following: data.following ?? 0,
        account_created_at: data.account_created_at ?? null,
        languages: data.languages ?? null,
        top_repos: data.top_repos ?? null,
        total_stars: data.total_stars ?? 0,
        total_forks: data.total_forks ?? 0,
        total_commits_year: data.total_commits_year ?? 0,
        orgs_count: data.orgs_count ?? 0,
        github_score: data.github_score ?? null,
        flags: data.flags ?? null,
        access_token: data.access_token ?? sql`${githubProfiles.access_token}`,
        fetched_at: sql`now()`,
      },
    });
}

export async function getGithubProfile(userId: number): Promise<GithubProfile | null> {
  const db = getDb();
  const rows = await db.select().from(githubProfiles).where(eq(githubProfiles.user_id, userId)).limit(1);
  return rows[0] ? toGithubProfile(rows[0]) : null;
}

export async function getGithubByGithubId(githubId: number): Promise<GithubProfile | null> {
  const db = getDb();
  const rows = await db.select().from(githubProfiles).where(eq(githubProfiles.github_id, githubId)).limit(1);
  return rows[0] ? toGithubProfile(rows[0]) : null;
}

export async function deleteGithubProfile(userId: number) {
  const db = getDb();
  await db.delete(githubProfiles).where(eq(githubProfiles.user_id, userId));
}

export async function isGithubStale(userId: number): Promise<boolean> {
  const profile = await getGithubProfile(userId);
  if (!profile) return true;
  const fetchedAt = new Date(profile.fetched_at).getTime();
  const dayInMs = 24 * 60 * 60 * 1000;
  return Date.now() - fetchedAt > dayInMs;
}

export async function getGithubAccessToken(userId: number): Promise<string | null> {
  const db = getDb();
  const rows = await db.select({ access_token: githubProfiles.access_token })
    .from(githubProfiles).where(eq(githubProfiles.user_id, userId)).limit(1);
  return rows[0]?.access_token ?? null;
}

export async function countGithubVerified(): Promise<number> {
  const db = getDb();
  const rows = await db.select({ count: sql<number>`count(*)` }).from(githubProfiles);
  return Number(rows[0]?.count ?? 0);
}

export async function aggregateLanguages(): Promise<Array<{ name: string; count: number }>> {
  const db = getDb();
  const rows = await db.select({ languages: githubProfiles.languages }).from(githubProfiles);
  const langCounts: Record<string, number> = {};
  for (const row of rows) {
    if (row.languages && typeof row.languages === "object") {
      for (const lang of Object.keys(row.languages as Record<string, number>)) {
        langCounts[lang] = (langCounts[lang] || 0) + 1;
      }
    }
  }
  return Object.entries(langCounts)
    .map(([name, c]) => ({ name, count: c }))
    .sort((a, b) => b.count - a.count);
}

export async function getPlatformStats(): Promise<{
  total_deals: number;
  completed_deals: number;
  total_volume: number;
  total_users: number;
  avg_rating: number;
  github_verified: number;
  success_rate: number;
}> {
  const db = getDb();

  const [dealStats] = await db.select({
    total: sql<number>`count(*)`,
    completed: sql<number>`count(*) filter (where ${deals.status} = 'completed')`,
    volume: sql<number>`coalesce(sum(${deals.amount}), 0)`,
  }).from(deals);

  const [userCount] = await db.select({ total: sql<number>`count(*)` }).from(users);

  const [repStats] = await db.select({
    avg_rating: sql<number>`coalesce(avg(case when ${reputation.rating_count} > 0 then ${reputation.total_rating}::float / ${reputation.rating_count} else null end), 0)`,
  }).from(reputation);

  const githubCount = await countGithubVerified();

  const total = Number(dealStats?.total ?? 0);
  const completed = Number(dealStats?.completed ?? 0);

  return {
    total_deals: total,
    completed_deals: completed,
    total_volume: Number(dealStats?.volume ?? 0),
    total_users: Number(userCount?.total ?? 0),
    avg_rating: Math.round((Number(repStats?.avg_rating ?? 0)) * 10) / 10,
    github_verified: githubCount,
    success_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export async function getRecentDeals(limit = 10): Promise<Array<{
  amount: number;
  currency: string;
  status: string;
  created_at: Date;
  description: string;
}>> {
  const db = getDb();
  const rows = await db.select({
    amount: deals.amount,
    currency: deals.currency,
    status: deals.status,
    created_at: deals.created_at,
    description: deals.description,
  }).from(deals)
    .orderBy(desc(deals.created_at))
    .limit(limit);
  return rows;
}

// --- Sources ---

export interface Source {
  id: string;
  type: string;
  telegram_id: number;
  title: string;
  username: string | null;
  status: string;
  group_stats_id: number | null;
  added_by: number | null;
  created_at: string;
}

function toSource(row: any): Source {
  return {
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

export async function createSource(data: {
  id: string;
  type?: string;
  telegram_id?: number;
  title: string;
  username?: string;
  added_by?: number;
  group_stats_id?: number;
}): Promise<Source> {
  const db = getDb();
  await db.insert(sources).values({
    id: data.id,
    type: data.type ?? "group",
    telegram_id: data.telegram_id ?? null,
    title: data.title,
    username: data.username ?? null,
    added_by: data.added_by ?? null,
    group_stats_id: data.group_stats_id ?? null,
  });
  return (await getSourceById(data.id))!;
}

export async function getSourceById(id: string): Promise<Source | null> {
  const db = getDb();
  const rows = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  return rows[0] ? toSource(rows[0]) : null;
}

export async function getAllSources(): Promise<Source[]> {
  const db = getDb();
  const rows = await db.select().from(sources).orderBy(desc(sources.created_at));
  return rows.map(toSource);
}

export async function updateSource(id: string, data: Partial<{ title: string; username: string; status: string }>) {
  const db = getDb();
  await db.update(sources).set(data).where(eq(sources.id, id));
}

export async function getActiveSourceIds(): Promise<Set<number>> {
  const db = getDb();
  const rows = await db.select({ telegram_id: sources.telegram_id })
    .from(sources)
    .where(eq(sources.status, "active"));
  return new Set(rows.map(r => r.telegram_id).filter((id): id is number => id !== null));
}

export async function getActiveChannelWebSources(): Promise<Array<{ id: string; username: string }>> {
  const db = getDb();
  const rows = await db.select({ id: sources.id, username: sources.username })
    .from(sources)
    .where(and(eq(sources.type, "channel_web"), eq(sources.status, "active")));
  return rows.filter((r): r is { id: string; username: string } => !!r.username);
}

export async function getSourceByTelegramId(telegramId: number): Promise<Source | null> {
  const db = getDb();
  const rows = await db.select().from(sources).where(eq(sources.telegram_id, telegramId)).limit(1);
  return rows[0] ? toSource(rows[0]) : null;
}

// --- Parsed Jobs ---

export interface ParsedJob {
  id: string;
  source_id: string;
  message_id: number;
  raw_text: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  required_skills: string[] | null;
  deadline: string | null;
  contact_username: string | null;
  contact_url: string | null;
  poster_telegram_id: number | null;
  poster_username: string | null;
  status: string;
  matched_count: number;
  created_at: string;
  expires_at: string | null;
}

function toParsedJob(row: any): ParsedJob {
  return {
    ...row,
    required_skills: row.required_skills ?? null,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    expires_at: row.expires_at instanceof Date ? row.expires_at.toISOString() : row.expires_at,
    deadline: row.deadline instanceof Date ? row.deadline.toISOString() : row.deadline,
  };
}

export async function createParsedJob(data: {
  id: string;
  source_id: string;
  message_id: number;
  raw_text: string;
  title: string;
  description: string;
  budget_min?: number;
  budget_max?: number;
  currency?: string;
  required_skills?: string[];
  deadline?: Date;
  contact_username?: string;
  contact_url?: string;
  poster_telegram_id?: number;
  poster_username?: string;
}): Promise<ParsedJob> {
  const db = getDb();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.insert(parsedJobs).values({
    id: data.id,
    source_id: data.source_id,
    message_id: data.message_id,
    raw_text: data.raw_text,
    title: data.title,
    description: data.description,
    budget_min: data.budget_min ?? null,
    budget_max: data.budget_max ?? null,
    currency: data.currency ?? "RUB",
    required_skills: data.required_skills ?? null,
    deadline: data.deadline ?? null,
    contact_username: data.contact_username ?? null,
    contact_url: data.contact_url ?? null,
    poster_telegram_id: data.poster_telegram_id ?? null,
    poster_username: data.poster_username ?? null,
    expires_at: expiresAt,
  });
  return (await getParsedJobById(data.id))!;
}

export async function getParsedJobById(id: string): Promise<ParsedJob | null> {
  const db = getDb();
  const rows = await db.select().from(parsedJobs).where(eq(parsedJobs.id, id)).limit(1);
  return rows[0] ? toParsedJob(rows[0]) : null;
}

export async function getParsedJobs(opts: {
  skills?: string[];
  min_budget?: number;
  max_budget?: number;
  status?: string[];
  page?: number;
  limit?: number;
} = {}): Promise<{ data: ParsedJob[]; total: number }> {
  const db = getDb();
  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 20, 50);
  const offset = (page - 1) * limit;
  const statusList = opts.status ?? ["new", "verified"];

  const conditions = [
    inArray(parsedJobs.status, statusList),
  ];

  if (opts.min_budget != null) {
    conditions.push(gte(parsedJobs.budget_max, opts.min_budget));
  }
  if (opts.max_budget != null) {
    conditions.push(lte(parsedJobs.budget_min, opts.max_budget));
  }
  if (opts.skills && opts.skills.length > 0) {
    conditions.push(sql`${parsedJobs.required_skills} ?| array[${sql.join(opts.skills.map(s => sql`${s}`), sql`, `)}]`);
  }

  const where = and(...conditions);

  const [countResult] = await db.select({ total: sql<number>`count(*)` })
    .from(parsedJobs).where(where);

  const rows = await db.select().from(parsedJobs)
    .where(where)
    .orderBy(desc(parsedJobs.created_at))
    .limit(limit)
    .offset(offset);

  return { data: rows.map(toParsedJob), total: Number(countResult?.total ?? 0) };
}

export async function updateJobStatus(id: string, status: string) {
  const db = getDb();
  await db.update(parsedJobs).set({ status }).where(eq(parsedJobs.id, id));
}

export async function markJobsExpired() {
  const db = getDb();
  await db.update(parsedJobs)
    .set({ status: "expired" })
    .where(and(
      inArray(parsedJobs.status, ["new", "verified"]),
      lte(parsedJobs.expires_at, sql`now()`),
    ));
}

export async function updateJobMatchedCount(id: string, count: number) {
  const db = getDb();
  await db.update(parsedJobs).set({ matched_count: count }).where(eq(parsedJobs.id, id));
}

// --- Platform Settings ---

export async function getSetting(key: string): Promise<unknown | null> {
  const db = getDb();
  const rows = await db.select({ value: platformSettings.value })
    .from(platformSettings)
    .where(eq(platformSettings.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: unknown, adminId: number) {
  const db = getDb();
  await db.insert(platformSettings)
    .values({ key, value: value as any, updated_at: sql`now()`, updated_by: adminId })
    .onConflictDoUpdate({
      target: platformSettings.key,
      set: { value: value as any, updated_at: sql`now()`, updated_by: adminId },
    });
}

export async function getAllSettings(): Promise<Record<string, unknown>> {
  const db = getDb();
  const rows = await db.select().from(platformSettings);
  const result: Record<string, unknown> = {};
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

// --- Admin User Management ---

export async function banUser(telegramId: number) {
  const db = getDb();
  await db.update(users)
    .set({ banned_at: sql`now()` })
    .where(eq(users.telegram_id, telegramId));
}

export async function unbanUser(telegramId: number) {
  const db = getDb();
  await db.update(users)
    .set({ banned_at: null })
    .where(eq(users.telegram_id, telegramId));
}

export async function isUserBanned(telegramId: number): Promise<boolean> {
  const db = getDb();
  const rows = await db.select({ banned_at: users.banned_at })
    .from(users)
    .where(eq(users.telegram_id, telegramId))
    .limit(1);
  return rows[0]?.banned_at != null;
}

export async function searchUsers(opts: {
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: Array<{ telegram_id: number; username: string | null; wallet_address: string | null; banned_at: string | null; created_at: string }>; total: number }> {
  const db = getDb();
  const page = opts.page ?? 1;
  const limit = Math.min(opts.limit ?? 20, 50);
  const offset = (page - 1) * limit;

  const conditions = [];
  if (opts.search) {
    conditions.push(
      or(
        sql`${users.username} ILIKE ${'%' + opts.search + '%'}`,
        sql`${users.telegram_id}::text LIKE ${'%' + opts.search + '%'}`,
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db.select({ total: sql<number>`count(*)` })
    .from(users).where(where);

  const rows = await db.select({
    telegram_id: users.telegram_id,
    username: users.username,
    wallet_address: users.wallet_address,
    banned_at: users.banned_at,
    created_at: users.created_at,
  }).from(users)
    .where(where)
    .orderBy(desc(users.created_at))
    .limit(limit)
    .offset(offset);

  return {
    data: rows.map(r => ({
      ...r,
      banned_at: r.banned_at instanceof Date ? r.banned_at.toISOString() : r.banned_at as string | null,
      created_at: r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at as string,
    })),
    total: Number(countResult?.total ?? 0),
  };
}

// --- Admin Disputes ---

export async function getDisputeDeals(): Promise<Deal[]> {
  const db = getDb();
  const rows = await db.select().from(deals)
    .where(eq(deals.status, "disputed"))
    .orderBy(deals.updated_at);
  return rows.map(toDeal);
}

export async function resolveDeal(dealId: string, resolution: {
  resolution_type: string;
  resolution_note: string;
  resolved_by: number;
}) {
  const db = getDb();
  await db.update(deals).set({
    status: "resolved",
    resolution_type: resolution.resolution_type,
    resolution_note: resolution.resolution_note,
    resolved_by: resolution.resolved_by,
    resolved_at: sql`now()`,
    updated_at: sql`now()`,
  }).where(eq(deals.id, dealId));
}

// --- Admin Dashboard Stats ---

export async function getAdminDashboardStats(): Promise<{
  total_users: number;
  active_users_7d: number;
  total_deals: number;
  active_deals: number;
  total_volume: number;
  active_disputes: number;
  total_sources: number;
  active_sources: number;
  github_verified_count: number;
}> {
  const db = getDb();

  const [userStats] = await db.select({
    total: sql<number>`count(*)`,
  }).from(users);

  const [activeUsersStats] = await db.select({
    total: sql<number>`count(*)`,
  }).from(reputation).where(gte(reputation.last_active_at, sql`now() - interval '7 days'`));

  const [dealStats] = await db.select({
    total: sql<number>`count(*)`,
    active: sql<number>`count(*) filter (where ${deals.status} not in ('completed', 'resolved', 'expired', 'cancelled'))`,
    volume: sql<number>`coalesce(sum(${deals.amount}), 0)`,
    disputes: sql<number>`count(*) filter (where ${deals.status} = 'disputed')`,
  }).from(deals);

  const [sourceStats] = await db.select({
    total: sql<number>`count(*)`,
    active: sql<number>`count(*) filter (where ${sources.status} = 'active')`,
  }).from(sources);

  const ghCount = await countGithubVerified();

  return {
    total_users: Number(userStats?.total ?? 0),
    active_users_7d: Number(activeUsersStats?.total ?? 0),
    total_deals: Number(dealStats?.total ?? 0),
    active_deals: Number(dealStats?.active ?? 0),
    total_volume: Number(dealStats?.volume ?? 0),
    active_disputes: Number(dealStats?.disputes ?? 0),
    total_sources: Number(sourceStats?.total ?? 0),
    active_sources: Number(sourceStats?.active ?? 0),
    github_verified_count: ghCount,
  };
}

// --- Poster Matching ---

export async function getJobsByPoster(telegramId: number): Promise<Array<ParsedJob & { response_count: number }>> {
  const db = getDb();
  const rows = await db.select({
    job: parsedJobs,
    response_count: sql<number>`(select count(*) from job_responses where job_responses.parsed_job_id = ${parsedJobs.id})`,
  }).from(parsedJobs)
    .where(eq(parsedJobs.poster_telegram_id, telegramId))
    .orderBy(desc(parsedJobs.created_at));
  return rows.map(r => ({ ...toParsedJob(r.job), response_count: Number(r.response_count) }));
}

export async function getJobsForNewUser(telegramId: number, username?: string): Promise<ParsedJob[]> {
  const db = getDb();
  const conditions = [eq(parsedJobs.poster_telegram_id, telegramId)];
  if (username) {
    conditions.push(eq(parsedJobs.poster_username, username));
  }
  const rows = await db.select().from(parsedJobs)
    .where(or(...conditions))
    .orderBy(desc(parsedJobs.created_at));
  return rows.map(toParsedJob);
}

// --- Job Responses ---

export interface JobResponse {
  id: string;
  parsed_job_id: string;
  user_id: number;
  proposal_text: string;
  created_at: string;
}

function toJobResponse(row: any): JobResponse {
  return {
    ...row,
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

export async function createJobResponse(data: {
  id: string;
  parsed_job_id: string;
  user_id: number;
  proposal_text: string;
}): Promise<JobResponse> {
  const db = getDb();
  await db.insert(jobResponses).values({
    id: data.id,
    parsed_job_id: data.parsed_job_id,
    user_id: data.user_id,
    proposal_text: data.proposal_text,
  });
  const rows = await db.select().from(jobResponses).where(eq(jobResponses.id, data.id)).limit(1);
  return toJobResponse(rows[0]);
}

export async function getJobResponses(parsedJobId: string): Promise<JobResponse[]> {
  const db = getDb();
  const rows = await db.select().from(jobResponses)
    .where(eq(jobResponses.parsed_job_id, parsedJobId))
    .orderBy(desc(jobResponses.created_at));
  return rows.map(toJobResponse);
}

export async function hasUserResponded(parsedJobId: string, userId: number): Promise<boolean> {
  const db = getDb();
  const rows = await db.select({ id: jobResponses.id }).from(jobResponses)
    .where(and(eq(jobResponses.parsed_job_id, parsedJobId), eq(jobResponses.user_id, userId)))
    .limit(1);
  return rows.length > 0;
}

export async function countResponsesByJob(parsedJobId: string): Promise<number> {
  const db = getDb();
  const [result] = await db.select({ total: sql<number>`count(*)` })
    .from(jobResponses)
    .where(eq(jobResponses.parsed_job_id, parsedJobId));
  return Number(result?.total ?? 0);
}

export async function getGithubProfilesWithSkillOverlap(skills: string[]): Promise<Array<{ user_id: number; languages: Record<string, number> }>> {
  const db = getDb();
  if (skills.length === 0) return [];
  const rows = await db.select({
    user_id: githubProfiles.user_id,
    languages: githubProfiles.languages,
  }).from(githubProfiles)
    .where(sql`${githubProfiles.languages} ?| array[${sql.join(skills.map(s => sql`${s}`), sql`, `)}]`);
  return rows.map(r => ({
    user_id: r.user_id,
    languages: (r.languages ?? {}) as Record<string, number>,
  }));
}
