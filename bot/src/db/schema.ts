import { pgTable, text, integer, real, timestamp, jsonb, uniqueIndex, bigint, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  telegram_id: integer("telegram_id").primaryKey(),
  username: text("username"),
  wallet_address: text("wallet_address"),
  notification_preferences: jsonb("notification_preferences").$type<{
    enabled?: boolean;
    min_match_percent?: number;
    min_budget?: number;
    max_per_day?: number;
    preferred_skills?: string[];
  }>(),
  banned_at: timestamp("banned_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const deals = pgTable("deals", {
  id: text("id").primaryKey(),
  seller_id: integer("seller_id").notNull(),
  buyer_id: integer("buyer_id").notNull(),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("TON"),
  description: text("description").notNull(),
  status: text("status").notNull().default("created"),
  contract_address: text("contract_address"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  delivered_at: timestamp("delivered_at"),
  timeout_at: timestamp("timeout_at"),
  original_amount: real("original_amount"),
  original_currency: text("original_currency"),
  exchange_rate: real("exchange_rate"),
  rate_expires_at: integer("rate_expires_at"),
  resolution_type: text("resolution_type"),
  resolution_note: text("resolution_note"),
  resolved_by: integer("resolved_by"),
  resolved_at: timestamp("resolved_at"),
});

export const reputation = pgTable("reputation", {
  user_id: integer("user_id").primaryKey(),
  completed_deals: integer("completed_deals").notNull().default(0),
  total_rating: integer("total_rating").notNull().default(0),
  rating_count: integer("rating_count").notNull().default(0),
  avg_completion_days: real("avg_completion_days"),
  cancelled_deals: integer("cancelled_deals").notNull().default(0),
  disputes_opened: integer("disputes_opened").notNull().default(0),
  disputes_lost: integer("disputes_lost").notNull().default(0),
  repeat_clients: integer("repeat_clients").notNull().default(0),
  last_active_at: timestamp("last_active_at"),
});

export const offers = pgTable("offers", {
  id: text("id").primaryKey(),
  creator_id: integer("creator_id").notNull(),
  description: text("description").notNull(),
  min_price: real("min_price"),
  currency: text("currency").notNull().default("TON"),
  role: text("role").notNull().default("buyer"),
  status: text("status").notNull().default("open"),
  deal_id: text("deal_id"),
  max_applicants: integer("max_applicants").default(50),
  inline_message_id: text("inline_message_id"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  offer_id: text("offer_id").notNull(),
  user_id: integer("user_id").notNull(),
  price: real("price").notNull(),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("applications_offer_user_idx").on(table.offer_id, table.user_id),
]);

export const groupStats = pgTable("group_stats", {
  group_id: bigint("group_id", { mode: "number" }).primaryKey(),
  title: text("title"),
  username: text("username"),
  member_count: integer("member_count"),
  bot_active: integer("bot_active").notNull().default(1),
  total_offers: integer("total_offers").notNull().default(0),
  completed_deals: integer("completed_deals").notNull().default(0),
  total_volume: real("total_volume").notNull().default(0),
  avg_check: real("avg_check"),
  conversion_rate: real("conversion_rate"),
  category: text("category"),
  first_seen_at: timestamp("first_seen_at").notNull().defaultNow(),
  last_activity_at: timestamp("last_activity_at"),
});

export const dealGroups = pgTable("deal_groups", {
  deal_id: text("deal_id").notNull(),
  group_id: bigint("group_id", { mode: "number" }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.deal_id, table.group_id] }),
]);

export const githubProfiles = pgTable("github_profiles", {
  user_id: integer("user_id").primaryKey(),
  github_id: integer("github_id").notNull(),
  username: text("username").notNull(),
  avatar_url: text("avatar_url"),
  profile_url: text("profile_url"),
  bio: text("bio"),
  public_repos: integer("public_repos").notNull().default(0),
  followers: integer("followers").notNull().default(0),
  following: integer("following").notNull().default(0),
  account_created_at: timestamp("account_created_at"),
  languages: jsonb("languages").$type<Record<string, number>>(),
  top_repos: jsonb("top_repos").$type<Array<{ name: string; stars: number; forks: number; language: string | null }>>(),
  total_stars: integer("total_stars").notNull().default(0),
  total_forks: integer("total_forks").notNull().default(0),
  total_commits_year: integer("total_commits_year").notNull().default(0),
  orgs_count: integer("orgs_count").notNull().default(0),
  github_score: real("github_score"),
  flags: jsonb("flags").$type<{ green: string[]; red: string[] }>(),
  access_token: text("access_token"),
  fetched_at: timestamp("fetched_at").notNull().defaultNow(),
  linked_at: timestamp("linked_at").notNull().defaultNow(),
});

export const sources = pgTable("sources", {
  id: text("id").primaryKey(),
  type: text("type").notNull().default("group"),
  telegram_id: bigint("telegram_id", { mode: "number" }).unique(),
  title: text("title").notNull(),
  username: text("username"),
  status: text("status").notNull().default("active"),
  group_stats_id: bigint("group_stats_id", { mode: "number" }),
  added_by: integer("added_by"),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const parsedJobs = pgTable("parsed_jobs", {
  id: text("id").primaryKey(),
  source_id: text("source_id").notNull(),
  message_id: bigint("message_id", { mode: "number" }).notNull(),
  raw_text: text("raw_text").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  budget_min: real("budget_min"),
  budget_max: real("budget_max"),
  currency: text("currency").notNull().default("RUB"),
  required_skills: jsonb("required_skills").$type<string[]>(),
  deadline: timestamp("deadline"),
  contact_username: text("contact_username"),
  contact_url: text("contact_url"),
  poster_telegram_id: bigint("poster_telegram_id", { mode: "number" }),
  poster_username: text("poster_username"),
  status: text("status").notNull().default("new"),
  matched_count: integer("matched_count").notNull().default(0),
  created_at: timestamp("created_at").notNull().defaultNow(),
  expires_at: timestamp("expires_at"),
}, (table) => [
  uniqueIndex("parsed_jobs_source_message_idx").on(table.source_id, table.message_id),
]);

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  updated_by: integer("updated_by"),
});

export const jobResponses = pgTable("job_responses", {
  id: text("id").primaryKey(),
  parsed_job_id: text("parsed_job_id").notNull(),
  user_id: integer("user_id").notNull(),
  proposal_text: text("proposal_text").notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("job_responses_job_user_idx").on(table.parsed_job_id, table.user_id),
]);

export const riskAssessments = pgTable("risk_assessments", {
  user_id: integer("user_id").primaryKey(),
  score: real("score").notNull(),
  level: text("level").notNull(),
  factors: jsonb("factors").notNull(),
  assessed_at: timestamp("assessed_at").notNull().defaultNow(),
});
