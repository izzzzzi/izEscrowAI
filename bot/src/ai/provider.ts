import OpenAI from "openai";

export interface AIProvider {
  getClient(): OpenAI;
  getModel(): string;
}

class OpenRouterProvider implements AIProvider {
  private client: OpenAI | null = null;

  getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
      });
    }
    return this.client;
  }

  getModel(): string {
    return process.env.OPENROUTER_MODEL || "openai/gpt-4.1-nano";
  }
}

class CocoonProvider implements AIProvider {
  private client: OpenAI | null = null;

  getClient(): OpenAI {
    if (!this.client) {
      this.client = new OpenAI({
        baseURL: process.env.COCOON_BASE_URL || "http://localhost:10000/v1",
        apiKey: process.env.COCOON_API_KEY || "none",
      });
    }
    return this.client;
  }

  getModel(): string {
    return process.env.COCOON_MODEL || "Qwen/Qwen3-32B";
  }
}

let _provider: AIProvider | null = null;

export function createProvider(): AIProvider {
  if (!_provider) {
    const provider = process.env.AI_PROVIDER || "openrouter";
    switch (provider) {
      case "cocoon":
        _provider = new CocoonProvider();
        break;
      case "openrouter":
      default:
        _provider = new OpenRouterProvider();
        break;
    }
  }
  return _provider;
}
