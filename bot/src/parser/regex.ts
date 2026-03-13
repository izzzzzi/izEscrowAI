const JOB_KEYWORDS_RU = [
  "ищу", "нужен", "нужна", "нужны", "требуется", "требуются",
  "разработчик", "разработчика", "программист", "программиста",
  "дизайнер", "дизайнера", "фрилансер", "фрилансера",
  "верстальщик", "верстальщика", "бэкенд", "фронтенд",
  "бюджет", "оплата", "гонорар", "ставка",
  "фриланс", "удалённ", "удаленн",
  "проект", "задача", "заказ",
  "тз", "техзадание",
];

const JOB_KEYWORDS_EN = [
  "looking for", "need a", "seeking",
  "developer", "designer", "freelancer", "programmer",
  "frontend", "backend", "fullstack", "full-stack",
  "budget", "rate",
  "freelance", "contract",
  "react", "node", "python", "typescript",
];

const NOT_JOB_KEYWORDS = [
  "в команду", "в штат", "в офис",
  "full-time", "full time", "fulltime",
  "join our team", "join the team",
  "we're hiring", "we are hiring",
  "вакансия", "вакансии",
  "зарплата", "salary", "з/п",
  "оклад",
];

const BUDGET_PATTERN = /\b\d{2,}[\s]?[₽$€кkК]|\$\s?\d{2,}|от\s+\d{2,}|бюджет|budget/i;

const keywordsPattern = new RegExp(
  [...JOB_KEYWORDS_RU, ...JOB_KEYWORDS_EN].map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "i",
);

const notJobPattern = new RegExp(
  NOT_JOB_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "i",
);

export function isJobCandidate(text: string): boolean {
  if (!text || text.length < 20) return false;
  if (notJobPattern.test(text)) return false;
  if (keywordsPattern.test(text)) return true;
  if (BUDGET_PATTERN.test(text)) return true;
  return false;
}
