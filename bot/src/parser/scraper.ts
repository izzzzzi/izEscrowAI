import * as cheerio from "cheerio";

// CSS selectors for t.me/s/ web preview DOM
const SELECTORS = {
  messageWrap: ".tgme_widget_message_wrap",
  message: ".tgme_widget_message",
  text: ".tgme_widget_message_text",
  date: "time[datetime]",
  views: ".tgme_widget_message_views",
  author: ".tgme_widget_message_from_author",
} as const;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Per-source dedup: sourceId -> Set<postId>
const seenPosts = new Map<string, Set<string>>();

export interface ScrapedMessage {
  postId: string; // e.g. "channel/123"
  messageId: number; // numeric part: 123
  text: string;
  datetime: string; // ISO
  views: string | null;
}

// --- 2.1: Fetch channel HTML ---

export async function fetchChannelHtml(username: string): Promise<string | null> {
  try {
    const res = await fetch(`https://t.me/s/${username}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (res.status === 429) {
      console.warn(`[scraper] Rate limited for @${username}, skipping`);
      return null;
    }
    if (!res.ok) {
      console.warn(`[scraper] HTTP ${res.status} for @${username}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.error(`[scraper] Network error for @${username}:`, err);
    return null;
  }
}

// --- 2.2: Parse HTML into messages ---

export function parseChannelMessages(html: string): ScrapedMessage[] {
  const $ = cheerio.load(html);
  const messages: ScrapedMessage[] = [];

  $(SELECTORS.messageWrap).each((_i, wrap) => {
    const msgEl = $(wrap).find(SELECTORS.message);
    const postId = msgEl.attr("data-post");
    if (!postId) return;

    const textEl = $(wrap).find(SELECTORS.text);
    const text = textEl.text().trim();
    if (!text) return;

    const timeEl = $(wrap).find(SELECTORS.date);
    const datetime = timeEl.attr("datetime") || "";

    const viewsEl = $(wrap).find(SELECTORS.views);
    const views = viewsEl.text().trim() || null;

    // Extract numeric message ID from "channel/123"
    const numId = parseInt(postId.split("/")[1], 10);
    if (isNaN(numId)) return;

    messages.push({ postId, messageId: numId, text, datetime, views });
  });

  return messages;
}

// --- 2.3: Scrape channel with dedup + pipeline ---

export async function scrapeChannel(
  source: { id: string; username: string },
  processMessage: (text: string, sourceId: string, messageId: number, posterUsername?: string) => Promise<void>,
): Promise<number> {
  const html = await fetchChannelHtml(source.username);
  if (!html) return 0;

  const messages = parseChannelMessages(html);
  if (messages.length === 0) return 0;

  // Init dedup set for this source
  if (!seenPosts.has(source.id)) {
    seenPosts.set(source.id, new Set());
  }
  const seen = seenPosts.get(source.id)!;

  let processed = 0;
  for (const msg of messages) {
    if (seen.has(msg.postId)) continue;
    seen.add(msg.postId);

    try {
      await processMessage(msg.text, source.id, msg.messageId);
      processed++;
    } catch (err) {
      console.error(`[scraper] Pipeline error for ${msg.postId}:`, err);
    }
  }

  // Cap dedup set size (keep last 500 per source)
  if (seen.size > 500) {
    const entries = [...seen];
    const toRemove = entries.slice(0, entries.length - 500);
    for (const id of toRemove) seen.delete(id);
  }

  return processed;
}

// --- 4.1: Run scrape cycle ---

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function runScrapeCycle(
  getSources: () => Promise<Array<{ id: string; username: string }>>,
  processMessage: (text: string, sourceId: string, messageId: number, posterUsername?: string) => Promise<void>,
): Promise<void> {
  const sources = await getSources();
  if (sources.length === 0) return;

  console.log(`[scraper] Starting cycle: ${sources.length} channel(s)`);

  for (let i = 0; i < sources.length; i++) {
    const source = sources[i];
    try {
      const count = await scrapeChannel(source, processMessage);
      if (count > 0) {
        console.log(`[scraper] @${source.username}: ${count} new message(s) processed`);
      }
    } catch (err) {
      console.error(`[scraper] Error scraping @${source.username}:`, err);
    }

    // Delay between channels (2-3 sec), skip after last
    if (i < sources.length - 1) {
      await sleep(2000 + Math.random() * 1000);
    }
  }
}
