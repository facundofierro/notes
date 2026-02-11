import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createXai } from "@ai-sdk/xai";
import { generateText, generateObject, LanguageModel, CoreMessage, Tool } from "ai";
export type { CoreMessage, Tool };
import { z } from "zod";
export { z };

export interface LLMConfig {
  provider: "openai" | "google" | "anthropic" | "xai" | "custom";
  apiKey?: string;
  baseURL?: string; // For custom providers like OpenRouter or local LLMs
  model: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  jsonMode?: boolean;
  tools?: Record<string, any>;
}

export function createModel(config: LLMConfig): LanguageModel {
  switch (config.provider) {
    case "openai":
      const openai = createOpenAI({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY,
        baseURL: config.baseURL,
      });
      return openai(config.model) as unknown as LanguageModel;
    
    case "google":
      const google = createGoogleGenerativeAI({
        apiKey: config.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      });
      return google(config.model) as unknown as LanguageModel;
    
    case "anthropic":
      const anthropic = createAnthropic({
        apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      });
      return anthropic(config.model) as unknown as LanguageModel;

    case "xai":
        const xai = createXai({
            apiKey: config.apiKey || process.env.XAI_API_KEY,
        });
        return xai(config.model) as unknown as LanguageModel;
    
    case "custom":
      // Treat custom as OpenAI compatible by default
      const custom = createOpenAI({
        apiKey: config.apiKey || "not-needed",
        baseURL: config.baseURL,
      });
      return custom(config.model) as unknown as LanguageModel;
      
    default:
      throw new Error(`Unsupported provider: ${config.provider}`);
  }
}

export async function generateCompletion(
  config: LLMConfig,
  messages: CoreMessage[],
  options?: CompletionOptions
) {
  const model = createModel(config);
  
  return generateText({
    model,
    messages,
    temperature: options?.temperature,
     maxTokens: options?.maxTokens,
     topP: options?.topP,
     tools: options?.tools,
     ...options,
  } as any);
}

export async function generateStructuredObject<T>(
  config: LLMConfig,
  messages: CoreMessage[],
  schema: z.ZodType<T>,
  options?: CompletionOptions
) {
  const model = createModel(config);

  return generateObject({
    model,
    messages,
    schema,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
    mode: options?.jsonMode ? "json" : "auto",
    ...options,
  } as any);
}

