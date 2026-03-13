const GITHUB_API = "https://api.github.com";

interface GithubUser {
  id: number;
  login: string;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
}

interface GithubRepo {
  name: string;
  fork: boolean;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  pushed_at: string | null;
}

interface GithubOrg {
  login: string;
}

export interface FetchedGithubProfile {
  github_id: number;
  username: string;
  avatar_url: string;
  profile_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  account_created_at: Date;
  languages: Record<string, number>;
  top_repos: Array<{ name: string; stars: number; forks: number; language: string | null }>;
  total_stars: number;
  total_forks: number;
  total_commits_year: number;
  orgs_count: number;
  has_external_prs: boolean;
  all_forks: boolean;
}

async function ghFetch<T>(path: string, accessToken: string): Promise<T> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "izEscrowAI",
    },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

export async function fetchGithubProfile(accessToken: string): Promise<FetchedGithubProfile> {
  // Fetch user, repos, orgs in parallel
  const [user, repos, orgs] = await Promise.all([
    ghFetch<GithubUser>("/user", accessToken),
    ghFetch<GithubRepo[]>("/user/repos?per_page=100&sort=pushed", accessToken),
    ghFetch<GithubOrg[]>("/user/orgs", accessToken),
  ]);

  // Aggregate languages (weighted by repo activity)
  const languages: Record<string, number> = {};
  let totalStars = 0;
  let totalForks = 0;
  let forkCount = 0;

  for (const repo of repos) {
    if (repo.language) {
      languages[repo.language] = (languages[repo.language] || 0) + 1;
    }
    totalStars += repo.stargazers_count;
    totalForks += repo.forks_count;
    if (repo.fork) forkCount++;
  }

  // Top repos: sorted by stars, max 5, exclude forks
  const topRepos = repos
    .filter((r) => !r.fork)
    .sort((a, b) => b.stargazers_count - a.stargazers_count)
    .slice(0, 5)
    .map((r) => ({
      name: r.name,
      stars: r.stargazers_count,
      forks: r.forks_count,
      language: r.language,
    }));

  // Estimate commits in last year from events (rough)
  let totalCommitsYear = 0;
  try {
    const events = await ghFetch<Array<{ type: string }>>(
      "/user/events?per_page=100",
      accessToken,
    );
    totalCommitsYear = events.filter((e) => e.type === "PushEvent").length;
  } catch {
    // Events API may fail, not critical
  }

  // Check for external PRs (simplified: any PullRequestEvent in events)
  let hasExternalPrs = false;
  try {
    const events = await ghFetch<Array<{ type: string; repo?: { name: string } }>>(
      "/user/events?per_page=100",
      accessToken,
    );
    hasExternalPrs = events.some(
      (e) => e.type === "PullRequestEvent" && !e.repo?.name.startsWith(`${user.login}/`),
    );
  } catch {
    // Not critical
  }

  return {
    github_id: user.id,
    username: user.login,
    avatar_url: user.avatar_url,
    profile_url: user.html_url,
    bio: user.bio,
    public_repos: user.public_repos,
    followers: user.followers,
    following: user.following,
    account_created_at: new Date(user.created_at),
    languages,
    top_repos: topRepos,
    total_stars: totalStars,
    total_forks: totalForks,
    total_commits_year: totalCommitsYear,
    orgs_count: orgs.length,
    has_external_prs: hasExternalPrs,
    all_forks: repos.length > 0 && forkCount === repos.length,
  };
}

/**
 * Exchange OAuth code for access token
 */
export async function exchangeCode(code: string): Promise<string> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = (await res.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new Error(`GitHub OAuth error: ${data.error || "no token"}`);
  }
  return data.access_token;
}
