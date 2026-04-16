import type { ChatRequest, ChatResponse } from "./types"

/**
 * Chat with OpenAI GPT-4o
 */
export async function chatWithGPT4o(request: ChatRequest): Promise<ChatResponse> {
  const { messages, apiKey, temperature = 0.7, maxTokens = 2048 } = request

  if (!apiKey) {
    throw new Error("OpenAI API key is required")
  }

  if (!messages || messages.length === 0) {
    throw new Error("Messages are required")
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `GPT-4o API error: ${errorData.error?.message || errorData.message || response.statusText}`,
      )
    }

    const data = await response.json()

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response generated from GPT-4o")
    }

    const content = data.choices[0]?.message?.content || "No response generated"

    return {
      content,
      model: "gpt-4o",
      tokensUsed: data.usage?.total_tokens,
      timestamp: new Date().toISOString(),
    }
  } catch (error: any) {
    console.error("GPT-4o chat error:", error)
    throw new Error(`GPT-4o: ${error.message}`)
  }
}

/**
 * Chat with OpenAI GPT-4o Mini
 */
export async function chatWithGPT4oMini(request: ChatRequest): Promise<ChatResponse> {
  const { messages, apiKey, temperature = 0.7, maxTokens = 1024 } = request

  if (!apiKey) {
    throw new Error("OpenAI API key is required")
  }

  if (!messages || messages.length === 0) {
    throw new Error("Messages are required")
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(
        `GPT-4o Mini API error: ${errorData.error?.message || errorData.message || response.statusText}`,
      )
    }

    const data = await response.json()

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response generated from GPT-4o Mini")
    }

    const content = data.choices[0]?.message?.content || "No response generated"

    return {
      content,
      model: "gpt-4o-mini",
      tokensUsed: data.usage?.total_tokens,
      timestamp: new Date().toISOString(),
    }
  } catch (error: any) {
    console.error("GPT-4o Mini chat error:", error)
    throw new Error(`GPT-4o Mini: ${error.message}`)
  }
}

