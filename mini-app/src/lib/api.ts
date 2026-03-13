export const API_URL = import.meta.env.VITE_BOT_API_URL || "http://localhost:3000";

export function getInitData(): string {
  try {
    // @ts-expect-error - Telegram WebApp global
    return window.Telegram?.WebApp?.initData || "";
  } catch {
    return "";
  }
}

// Stored Telegram Login Widget auth data (set from AuthContext)
let _telegramAuthData: string | null = null;

export function setTelegramAuthData(data: string | null) {
  _telegramAuthData = data;
}

export function getAuthHeaders(): Record<string, string> {
  const initData = getInitData();
  if (initData) {
    return { "X-Init-Data": initData };
  }
  if (_telegramAuthData) {
    return { "X-Telegram-Auth": _telegramAuthData };
  }
  return {};
}

function headers(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { ...headers(), ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

// --- Deals ---

export interface Deal {
  id: string;
  amount: number;
  currency: string;
  description: string;
  status: string;
  seller_id: number;
  buyer_id: number;
  contract_address?: string;
  original_amount: number | null;
  original_currency: string | null;
}

export function fetchDeals(): Promise<Deal[]> {
  return apiFetch("/api/deals");
}

export function fetchDeal(dealId: string): Promise<Deal> {
  return apiFetch(`/api/deals/${dealId}`);
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
  created_at: string;
  application_count?: number;
}

export interface Application {
  id: string;
  offer_id: string;
  user_id: number;
  price: number;
  message: string | null;
  status: string;
  created_at: string;
  reputation?: DetailedReputation;
  trust_score?: number | null;
}

export interface OfferWithApps extends Offer {
  applications: Application[];
}

export function fetchOffers(): Promise<Offer[]> {
  return apiFetch("/api/offers");
}

export function fetchOffer(offerId: string): Promise<OfferWithApps> {
  return apiFetch(`/api/offers/${offerId}`);
}

export function createOffer(data: {
  description: string;
  min_price?: number;
  currency?: string;
  role?: string;
}): Promise<Offer> {
  return apiFetch("/api/offers", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function applyToOffer(
  offerId: string,
  data: { price: number; message?: string },
): Promise<Application> {
  return apiFetch(`/api/offers/${offerId}/apply`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function selectApplicant(
  offerId: string,
  applicationId: string,
): Promise<{ ok: boolean; message: string }> {
  return apiFetch(`/api/offers/${offerId}/select/${applicationId}`, {
    method: "POST",
  });
}

// --- Profile ---

export interface DetailedReputation {
  rating: number;
  completed_deals: number;
  avg_completion_days: number;
  cancelled_deals: number;
  disputes_opened: number;
  disputes_lost: number;
  repeat_clients: number;
  last_active_at: string | null;
}

export interface Profile {
  user_id: number;
  reputation: DetailedReputation;
  trust_score: number | null;
  deal_count?: number;
}

export function fetchProfile(): Promise<Profile> {
  return apiFetch("/api/profile");
}

export function fetchUserProfile(userId: number): Promise<Profile> {
  return apiFetch(`/api/profile/${userId}`);
}

// --- Risk ---

export interface RiskResult {
  score: number;
  level: "low" | "medium" | "high";
  factors: string[];
  recommendations: string[];
}

export interface DealRisk {
  buyer_risk: RiskResult;
  seller_risk: RiskResult;
  deal_recommendations: string[];
}

export function fetchDealRisk(dealId: string): Promise<DealRisk> {
  return apiFetch(`/api/risk/deal/${dealId}`);
}

// --- Stats ---

export interface PlatformStats {
  total_deals: number;
  completed_deals: number;
  total_volume: number;
  total_users: number;
  avg_rating: number;
  github_verified: number;
  success_rate: number;
}

export function fetchStats(): Promise<PlatformStats> {
  return fetch(`${API_URL}/api/stats`).then((r) => r.json());
}

// --- Talent ---

export interface TalentData {
  languages: Array<{ name: string; count: number }>;
  categories: Array<{ name: string; count: number; coming_soon?: boolean }>;
}

export function fetchTalent(): Promise<TalentData> {
  return fetch(`${API_URL}/api/talent`).then((r) => r.json());
}

// --- Activity ---

export interface ActivityItem {
  amount: number;
  currency: string;
  status: string;
  description: string;
  created_at: string;
}

export function fetchActivity(): Promise<ActivityItem[]> {
  return fetch(`${API_URL}/api/activity`).then((r) => r.json()).then((data) => Array.isArray(data) ? data : data?.activity ?? []);
}

// --- GitHub ---

export interface GithubProfile {
  github_id: number;
  username: string;
  avatar_url: string | null;
  profile_url: string | null;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  languages: Record<string, number> | null;
  top_repos: Array<{ name: string; stars: number; forks: number; language: string | null }> | null;
  total_stars: number;
  total_forks: number;
  total_commits_year: number;
  orgs_count: number;
  github_score: number | null;
  flags: { green: string[]; red: string[] } | null;
  linked_at: string;
}

export interface TrustBreakdown {
  total: number;
  platform: number;
  github: number;
  wallet: number;
  verification: number;
}

export interface ProfileWithGithub extends Profile {
  github: GithubProfile | null;
  trust_breakdown: TrustBreakdown;
  telegram_verified: boolean;
  wallet_connected: boolean;
  show_contact?: boolean;
}

export function fetchGithubLink(): Promise<{ url: string }> {
  return apiFetch("/api/github/auth");
}

export function fetchGithubUnlink(): Promise<{ ok: boolean }> {
  return apiFetch("/api/github/unlink", { method: "POST" });
}

export function registerWallet(address: string): Promise<{ ok: boolean }> {
  return apiFetch("/api/wallet", {
    method: "POST",
    body: JSON.stringify({ wallet_address: address }),
  });
}

// --- Groups ---

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

export function fetchLeaderboard(sort = "completed_deals", limit = 10): Promise<GroupStat[]> {
  return fetch(`${API_URL}/api/groups?sort=${sort}&limit=${limit}`).then((r) => r.json());
}

export function fetchGroup(groupId: number): Promise<GroupStat> {
  return fetch(`${API_URL}/api/groups/${groupId}`).then((r) => r.json());
}

// --- Public Offers (no auth required) ---

export interface PublicOffer extends Offer {
  creator_trust_score: number | null;
}

export interface PublicOfferDetail extends Offer {
  creator_reputation: DetailedReputation;
  creator_trust_score: number | null;
  application_count: number;
}

export function fetchPublicOffers(): Promise<PublicOffer[]> {
  return fetch(`${API_URL}/api/offers/public`).then((r) => r.json());
}

export function fetchPublicOffer(id: string): Promise<PublicOfferDetail> {
  return fetch(`${API_URL}/api/offers/public/${id}`).then((r) => r.json());
}

// --- Jobs ---

export interface PriceEstimate {
  min: number;
  median: number;
  max: number;
  recommended: number;
  currency: string;
  reasoning: string;
  factors: string[];
}

export interface ParsedJob {
  id: string;
  source_id: string;
  title: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  currency: string;
  required_skills: string[] | null;
  deadline: string | null;
  contact_username: string | null;
  contact_url: string | null;
  poster_username: string | null;
  status: string;
  matched_count: number;
  ai_price_estimate: PriceEstimate | null;
  created_at: string;
  expires_at: string | null;
  skill_match?: { match_percent: number; matched: string[]; missing: string[] };
}

export interface JobFilters {
  skills?: string[];
  min_budget?: number;
  max_budget?: number;
  currency?: string;
  sort?: string;
  has_budget?: boolean;
  status?: string;
  page?: number;
  limit?: number;
}

export async function fetchJobs(filters: JobFilters = {}): Promise<{ data: ParsedJob[]; total: number }> {
  const params = new URLSearchParams();
  if (filters.skills?.length) params.set("skills", filters.skills.join(","));
  if (filters.min_budget) params.set("min_budget", String(filters.min_budget));
  if (filters.max_budget) params.set("max_budget", String(filters.max_budget));
  if (filters.currency) params.set("currency", filters.currency);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.has_budget) params.set("has_budget", "true");
  if (filters.status) params.set("status", filters.status);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.limit) params.set("limit", String(filters.limit));
  const res = await fetch(`${API_URL}/api/jobs?${params}`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  return res.json();
}

export async function fetchJob(id: string): Promise<ParsedJob> {
  const res = await fetch(`${API_URL}/api/jobs/${id}`, { headers: getAuthHeaders() });
  if (res.status === 404) throw new Error("NOT_FOUND");
  if (!res.ok) throw new Error("Failed to fetch job");
  return res.json();
}

export async function fetchJobProposal(id: string): Promise<{ proposal_text: string }> {
  const res = await fetch(`${API_URL}/api/jobs/${id}/proposal`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to generate proposal");
  }
  return res.json();
}

// --- Admin API ---

export async function checkAdminStatus(): Promise<{ is_admin: boolean }> {
  return apiFetch("/api/admin/me");
}

export async function fetchAdminDashboard(): Promise<{
  total_users: number; active_users_7d: number; total_deals: number;
  active_deals: number; total_volume: number; active_disputes: number;
  total_sources: number; active_sources: number; github_verified_count: number;
}> {
  return apiFetch("/api/admin/dashboard");
}

export interface AdminSource {
  id: string; type: string; telegram_id: number | null; title: string;
  username: string | null; status: string; created_at: string;
}

export async function fetchAdminSources(): Promise<AdminSource[]> {
  return apiFetch("/api/admin/sources");
}

export async function createAdminSource(data: { telegram_id?: number; title: string; username?: string; type?: string }): Promise<AdminSource> {
  return apiFetch("/api/admin/sources", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateAdminSource(id: string, data: { title?: string; status?: string; username?: string }): Promise<void> {
  return apiFetch(`/api/admin/sources/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteAdminSource(id: string): Promise<void> {
  return apiFetch(`/api/admin/sources/${id}`, { method: "DELETE" });
}

export interface AdminJob {
  id: string; title: string; description: string; status: string;
  budget_min: number | null; budget_max: number | null; currency: string;
  required_skills: string[] | null; source_id: string; created_at: string;
}

export async function fetchAdminJobs(params?: { status?: string; source_id?: string; page?: number; limit?: number }): Promise<{ data: AdminJob[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.source_id) qs.set("source_id", params.source_id);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch(`/api/admin/jobs${query ? `?${query}` : ""}`);
}

export async function updateAdminJobStatus(id: string, status: string): Promise<void> {
  return apiFetch(`/api/admin/jobs/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export interface AdminUser {
  telegram_id: number; username: string | null; wallet_address: string | null;
  banned_at: string | null; created_at: string;
}

export async function fetchAdminUsers(params?: { search?: string; page?: number; limit?: number }): Promise<{ data: AdminUser[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.search) qs.set("search", params.search);
  if (params?.page) qs.set("page", String(params.page));
  if (params?.limit) qs.set("limit", String(params.limit));
  const query = qs.toString();
  return apiFetch(`/api/admin/users${query ? `?${query}` : ""}`);
}

export async function fetchAdminUserDetail(id: number): Promise<any> {
  return apiFetch(`/api/admin/users/${id}`);
}

export async function toggleUserBan(id: number, ban: boolean): Promise<void> {
  return apiFetch(`/api/admin/users/${id}/ban`, {
    method: "PUT",
    body: JSON.stringify({ ban }),
  });
}

export interface AdminDispute {
  id: string; seller_id: number; buyer_id: number; amount: number;
  currency: string; description: string; status: string; created_at: string; updated_at: string;
}

export async function fetchAdminDisputes(): Promise<AdminDispute[]> {
  return apiFetch("/api/admin/disputes");
}

export async function resolveDispute(dealId: string, data: { resolution_type: string; resolution_note: string }): Promise<void> {
  return apiFetch(`/api/admin/disputes/${dealId}/resolve`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function fetchAdminSettings(): Promise<Record<string, unknown>> {
  return apiFetch("/api/admin/settings");
}

export async function updateAdminSettings(settings: Record<string, unknown>): Promise<void> {
  return apiFetch("/api/admin/settings", {
    method: "PUT",
    body: JSON.stringify(settings),
  });
}

// --- Job Poster Matching ---

export interface JobResponse {
  id: string;
  parsed_job_id: string;
  user_id: number;
  proposal_text: string;
  created_at: string;
  executor?: {
    user_id: number;
    github: { username: string; avatar_url: string | null; languages: Record<string, number> | null; github_score: number | null } | null;
    trust_score: number | null;
    skill_match?: { percent: number; matched: string[]; total: number };
    reputation: { completed_deals: number; avg_rating: number };
  };
}

export interface MyJob extends ParsedJob {
  response_count: number;
}

export async function respondToJob(id: string, proposalText: string): Promise<JobResponse> {
  return apiFetch(`/jobs/${id}/respond`, { method: "POST", body: JSON.stringify({ proposal_text: proposalText }) });
}

export async function fetchMyJobs(): Promise<MyJob[]> {
  return apiFetch("/my-jobs");
}

export async function fetchMyJobResponses(id: string): Promise<{ job: ParsedJob; responses: JobResponse[] }> {
  return apiFetch(`/my-jobs/${id}/responses`);
}

export async function createDealFromJob(id: string, respondentId: number, amount: number, currency: string): Promise<any> {
  return apiFetch(`/my-jobs/${id}/create-deal`, { method: "POST", body: JSON.stringify({ respondent_user_id: respondentId, amount, currency }) });
}

export async function checkHasResponded(jobId: string): Promise<{ responded: boolean }> {
  return apiFetch(`/jobs/${jobId}/has-responded`);
}

// --- Specs ---

export interface SpecRequirement {
  description: string;
  acceptance_criteria: string[];
  status?: "met" | "partial" | "not_met";
}

export interface Spec {
  id: string;
  deal_id: string | null;
  creator_id: number;
  title: string;
  category: string | null;
  requirements: SpecRequirement[] | null;
  budget_min: number | null;
  budget_max: number | null;
  budget_currency: string;
  status: string;
  created_at: string;
}

export function fetchSpec(id: string): Promise<Spec> {
  return apiFetch(`/api/specs/${id}`);
}

export function createSpec(data: {
  title: string;
  category?: string;
  requirements?: SpecRequirement[];
  budget_min?: number;
  budget_max?: number;
  budget_currency?: string;
}): Promise<Spec> {
  return apiFetch("/api/specs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface GenerateSpecResult {
  type: "spec";
  title: string;
  category: string;
  requirements: string[];
  budget_range: { min: number; max: number; currency: string } | null;
}

export interface GenerateSpecQuestions {
  type: "questions";
  questions: string[];
}

export function generateSpecAI(
  description: string,
): Promise<GenerateSpecResult | GenerateSpecQuestions> {
  return apiFetch("/api/specs/generate", {
    method: "POST",
    body: JSON.stringify({ description }),
  });
}

// --- Groups Top ---

export function fetchTopGroups(limit = 10): Promise<GroupStat[]> {
  return fetch(`${API_URL}/api/groups/top?limit=${limit}`).then((r) => r.json());
}
