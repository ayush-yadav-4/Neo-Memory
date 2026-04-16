/**
 * Message format for all AI models
 */
export interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

export interface AIModel {
  chat(messages: Message[], systemPrompt?: string): Promise<ChatResponse>;
  streamChat(messages: Message[], systemPrompt?: string): AsyncGenerator<string>;
}

export interface AIModelConfig {
  apiKey: string;
  model?: string;
}
/**
 * Chat request parameters
 */
export interface ChatRequest {
  messages: Message[]
  apiKey: string
  userId?: string
  temperature?: number
  maxTokens?: number
}

/**
 * Chat response with metadata
 */
export interface ChatResponse {
  content: string
  model: string
  tokensUsed?: number
  timestamp: string
}

/**
 * AI Model providers
 */
export type AIProvider = "gemini-1.5" | "gemini-pro" | "gpt-4o" | "gpt-4o-mini" | "claude" | "perplexity"

