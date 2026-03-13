import type { Context } from "grammy";
import { isJobCandidate } from "./regex.js";
import { classifyGroupMessage, extractJobParams } from "../ai/index.js";
import { createParsedJob, getSourceByTelegramId } from "../db/index.js";
import { matchJobToExecutors } from "./matching.js";

// Dedup cache: "sourceId:messageId" -> timestamp
const processedMessages = new Map<string, number>();
const DEDUP_TTL = 60_000; // 60 seconds

// Poster DM throttle: telegramId -> last notified timestamp
const posterDmThrottle = new Map<number, number>();
const POSTER_DM_INTERVAL = 60 * 60 * 1000; // 1 hour

function cleanDedup() {
  const now = Date.now();
  for (const [key, ts] of processedMessages) {
    if (now - ts > DEDUP_TTL) processedMessages.delete(key);
  }
}

export async function processGroupMessage(ctx: Context, bot?: any): Promise<void> {
  const text = ctx.message?.text;
  const chatId = ctx.chat?.id;
  const messageId = ctx.message?.message_id;

  if (!text || !chatId || !messageId) return;

  // Check if this chat is an active source
  const source = await getSourceByTelegramId(chatId);
  if (!source || source.status !== "active") return;

  // Dedup check
  const dedupKey = `${source.id}:${messageId}`;
  if (processedMessages.has(dedupKey)) return;

  // Clean old entries periodically
  if (processedMessages.size > 1000) cleanDedup();

  // Stage 1: Regex pre-filter
  if (!isJobCandidate(text)) return;

  // Mark as processing (dedup)
  processedMessages.set(dedupKey, Date.now());

  try {
    // Stage 2: AI classification
    const classification = await classifyGroupMessage(text);
    if (classification.type !== "job" || classification.confidence < 0.7) return;

    // Stage 3: AI parameter extraction
    const params = await extractJobParams(text);
    if (!params) return;

    // Stage 4: Save to DB (with poster info)
    const posterId = ctx.from?.id;
    const posterUsername = ctx.from?.username;
    const jobId = `job_${Date.now()}_${messageId}`;
    const job = await createParsedJob({
      id: jobId,
      source_id: source.id,
      message_id: messageId,
      raw_text: text,
      title: params.title,
      description: params.description,
      budget_min: params.budget_min ?? undefined,
      budget_max: params.budget_max ?? undefined,
      currency: params.currency,
      required_skills: params.required_skills,
      deadline: params.deadline ? new Date(params.deadline) : undefined,
      contact_username: params.contact_username ?? undefined,
      contact_url: params.contact_url ?? undefined,
      poster_telegram_id: posterId ?? undefined,
      poster_username: posterUsername ?? undefined,
    });

    console.log(`[parser] New job parsed: "${job.title}" from source ${source.title} (${job.required_skills?.join(", ")})`);

    // Stage 5: DM poster about parsed job (throttled)
    if (posterId && bot) {
      const lastDm = posterDmThrottle.get(posterId) ?? 0;
      if (Date.now() - lastDm >= POSTER_DM_INTERVAL) {
        try {
          const miniAppUrl = process.env.MINI_APP_URL || "https://localhost:5173";
          await bot.api.sendMessage(posterId,
            `Мы нашли ваш заказ «${job.title}» в группе ${source.title}.\n\n` +
            `Верифицированные исполнители уже могут откликнуться. ` +
            `Откройте профиль, чтобы увидеть отклики:\n${miniAppUrl}/profile`,
          );
          posterDmThrottle.set(posterId, Date.now());
        } catch {
          // Poster blocked bot or hasn't started chat
        }
      }
    }

    // Stage 6: Match with executors asynchronously
    matchJobToExecutors(job, bot).catch(err =>
      console.error("[parser] Matching error:", err),
    );
  } catch (err) {
    console.error("[parser] Pipeline error:", err);
  }
}
