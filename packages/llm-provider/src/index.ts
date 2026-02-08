import { OpenAI } from "openai";
import { z } from "zod";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface LLMProvider {
  complete(messages: LLMMessage[], options?: CompletionOptions): Promise<string>;
  generateObject<T>(
    messages: LLMMessage[],
    schema: z.ZodType<T>,
    options?: CompletionOptions
  ): Promise<T>;
}

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey?: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
      baseURL,
    });
  }

  async complete(messages: LLMMessage[], options?: CompletionOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options?.model || "gpt-4o",
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      response_format: options?.jsonMode ? { type: "json_object" } : undefined,
    });

    return response.choices[0].message.content || "";
  }

  async generateObject<T>(
    messages: LLMMessage[],
    schema: z.ZodType<T>,
    options?: CompletionOptions
  ): Promise<T> {
    const jsonSchema = {
      type: "object",
      properties: (schema as any).shape, // Basic Zod handling, might need zod-to-json-schema for complex cases
      required: Object.keys((schema as any).shape || {}),
    };

    // For better structured output, we prompt the model to output JSON
    const msgs = [
      ...messages,
      {
        role: "system" as const,
        content: `You must respond with valid JSON matching the schema.`,
      },
    ];

    const content = await this.complete(msgs, {
      ...options,
      jsonMode: true,
    });

    try {
      const parsed = JSON.parse(content);
      return schema.parse(parsed);

      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    } catch (e: any) {
      throw new Error(`Failed to parse/validate JSON: ${e.message}. Content: ${content}`);
    }
  }
}

export const defaultProvider = new OpenAIProvider();
