import crypto from "crypto";

export interface TelegramLoginData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

/**
 * Verify Telegram Login Widget data.
 * https://core.telegram.org/widgets/login#checking-authorization
 *
 * Key derivation: SHA256(bot_token) — different from initData's HMAC("WebAppData", bot_token).
 */
export function verifyTelegramLoginWidget(
  data: TelegramLoginData,
  botToken: string,
): boolean {
  // Check auth_date expiry (86400s = 24 hours)
  const now = Math.floor(Date.now() / 1000);
  if (now - data.auth_date > 86400) {
    return false;
  }

  const { hash, ...rest } = data;

  // Build data_check_string: alphabetically sorted "key=value" joined by "\n"
  const dataCheckString = Object.entries(rest)
    .filter(([, v]) => v !== undefined && v !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");

  // Secret key = SHA256(bot_token)
  const secretKey = crypto.createHash("sha256").update(botToken).digest();

  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  return computedHash === hash;
}
