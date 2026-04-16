import { chatWithGemini15, chatWithGeminiPro } from "./gemini"
import { chatWithGPT4o, chatWithGPT4oMini } from "./openai"
import { chatWithClaude } from "./claude"
import { chatWithPerplexity } from "./perplexity"
import type { ChatRequest, ChatResponse, AIProvider, Message } from "./types"

/**
* Unified chat interface for all AI models
 */
export async function chatWithAI(provider: AIProvider, request: ChatRequest): Promise<ChatResponse> {
  switch (provider) {
    case "gemini-1.5":
      return chatWithGemini15(request)

    case "gemini-pro":
      return chatWithGeminiPro(request)

    case "gpt-4o":
      return chatWithGPT4o(request)

    case "gpt-4o-mini":
      return chatWithGPT4oMini(request)

    case "claude":
      return chatWithClaude(request)

    case "perplexity":
      return chatWithPerplexity(request)

    default:
      throw new Error(`Unknown AI provider: ${provider}`) 
  }
}

// Export individual functions
export { chatWithGemini15, chatWithGeminiPro, chatWithGPT4o, chatWithGPT4oMini, chatWithClaude, chatWithPerplexity }

// Export types
export type { ChatRequest, ChatResponse, Message, AIProvider }

