import type { Bot, Context } from "grammy";
import { getGithubProfilesWithSkillOverlap, updateJobMatchedCount, type ParsedJob } from "../db/index.js";
import { calcSkillMatch } from "../ai/index.js";

// Notification throttle: userId -> { count, date }
const notificationCounts = new Map<number, { count: number; date: string }>();
const MAX_NOTIFICATIONS_PER_DAY = 5;

function canNotify(userId: number): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const entry = notificationCounts.get(userId);
  if (!entry || entry.date !== today) {
    notificationCounts.set(userId, { count: 1, date: today });
    return true;
  }
  if (entry.count >= MAX_NOTIFICATIONS_PER_DAY) return false;
  entry.count++;
  return true;
}

export async function matchJobToExecutors(job: ParsedJob, bot?: Bot<Context>): Promise<void> {
  const skills = job.required_skills;
  if (!skills || skills.length === 0) return;

  // Find executors with overlapping GitHub languages
  const candidates = await getGithubProfilesWithSkillOverlap(skills);
  let matchedCount = 0;

  for (const candidate of candidates) {
    const match = calcSkillMatch(candidate.languages, skills);
    if (match.match_percent < 50) continue;

    matchedCount++;

    // Send notification if throttle allows and bot is available
    if (bot && canNotify(candidate.user_id)) {
      const miniAppUrl = process.env.MINI_APP_URL || "https://t.me/izEscrowBot/app";
      const budgetStr = job.budget_min || job.budget_max
        ? `\n💰 ${job.budget_min ? `от ${job.budget_min}` : ""}${job.budget_max ? ` до ${job.budget_max}` : ""} ${job.currency}`
        : "";
      const skillsStr = match.matched.slice(0, 5).join(", ");

      try {
        await bot.api.sendMessage(candidate.user_id,
          `🎯 Новый заказ для вас!\n\n` +
          `📋 ${job.title}${budgetStr}\n` +
          `🛠 Ваши навыки: ${skillsStr} (${match.match_percent}% совпадение)\n\n` +
          `Откройте маркетплейс чтобы откликнуться:`,
          {
            reply_markup: {
              inline_keyboard: [[
                { text: "📱 Открыть в маркетплейсе", url: `${miniAppUrl}?startapp=job_${job.id}` },
              ]],
            },
          },
        );
      } catch {
        // User may have blocked the bot
      }
    }
  }

  // Update matched count on the job
  if (matchedCount > 0) {
    await updateJobMatchedCount(job.id, matchedCount);
  }

  console.log(`[matching] Job "${job.title}": ${matchedCount} matches from ${candidates.length} candidates`);
}
