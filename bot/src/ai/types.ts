// SPDX-License-Identifier: AGPL-3.0-only
import type OpenAI from "openai";

export interface AIPromptsConfig {
  systemPrompt: string;
  mediationPrompt: string;
  classifyMessageTool: OpenAI.ChatCompletionTool;
  parseDealTool: OpenAI.ChatCompletionTool;
  parseOfferTool: OpenAI.ChatCompletionTool;
  parseBidTool: OpenAI.ChatCompletionTool;
}
