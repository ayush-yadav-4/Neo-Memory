import type { ChatRequest, ChatResponse, Message } from "./types"

/**
 * Chat with Anthropic Claude
 */
export async function chatWithClaude(request: ChatRequest): Promise<ChatResponse> {
  const { messages, apiKey, temperature = 0.7, maxTokens = 2048 } = request

  if (!apiKey) {
    throw new Error("Claude API key is required")
  }

  if (!messages || messages.length === 0) {
    throw new Error("Messages are required")
  }

  try {
    const { systemMessage, conversationMessages } = convertToClaudeFormat(messages)

    const requestBody: any = {
      model: "claude-3-5-sonnet-20241022",
      max_tokens: maxTokens,
      temperature,
      messages: conversationMessages,
    }

    if (systemMessage) {
      requestBody.system = systemMessage
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `Claude API error: ${errorData.error?.message || errorData.message || response.statusText}`,
      )
    }

    const data = await response.json()

    if (!data.content || data.content.length === 0) {
      throw new Error("No response generated from Claude")
    }

    const content = data.content[0]?.text || "No response generated"

    return {
      content,
      model: "claude-3-5-sonnet-20241022",
      tokensUsed: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      timestamp: new Date().toISOString(),
    }
  } catch (error: any) {
    console.error("Claude chat error:", error)
    throw new Error(`Claude: ${error.message}`)
  }
}

/**
 * Convert OpenAI-style messages to Claude format
 */
function convertToClaudeFormat(messages: Message[]) {
  let systemMessage: string | undefined
  const conversationMessages: any[] = []

  for (const msg of messages) {
    if (msg.role === "system") {
      systemMessage = msg.content
      continue
    }

    // Claude only supports user and assistant roles
    if (msg.role === "user" || msg.role === "assistant") {
      conversationMessages.push({
        role: msg.role,
        content: msg.content,
      })
    }
  }

  return { systemMessage, conversationMessages }
}

