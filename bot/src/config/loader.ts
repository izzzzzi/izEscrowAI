// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (c) 2026 izEscrowAI contributors

/**
 * Two-tier config loader: tries private file first, falls back to public defaults.
 *
 * Usage:
 *   const prompts = await loadConfig<AIPromptsConfig>("../ai/prompts");
 *   // Tries "../ai/prompts.js" first, then "../ai/prompts.default.js"
 */
export async function loadConfig<T>(basePath: string): Promise<T> {
  try {
    const mod = await import(basePath + ".js");
    console.log(`[config] Using private config: ${basePath}`);
    return mod.default ?? mod;
  } catch {
    try {
      const mod = await import(basePath + ".default.js");
      console.log(`[config] Using defaults: ${basePath}.default (create ${basePath}.ts to customize)`);
      return mod.default ?? mod;
    } catch (e) {
      throw new Error(`[config] Could not load config from ${basePath}: ${e}`);
    }
  }
}
