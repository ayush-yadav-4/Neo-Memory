import type { ChatRequest, ChatResponse, Message } from "./types"

/**
 * Convert messages to Perplexity-compatible format
 * Perplexity requires: system (optional) -> user -> assistant -> user (must end with user)
 */
function convertToPerplexityFormat(messages: Message[]): Message[] {
  const perplexityMessages: Message[] = []
  
  // Extract and merge ALL system messages
  const systemMessages = messages.filter(msg => msg.role === "system")
  let mergedSystemContent = ""
  
  if (systemMessages.length > 0) {
    mergedSystemContent = systemMessages.map(m => m.content).join("\n\n")
    console.log("📝 Perplexity: Merged system message length:", mergedSystemContent.length)
  }

  // Get conversation messages (non-system)
  const conversationMessages = messages.filter(msg => msg.role !== "system")

  if (conversationMessages.length === 0) {
    throw new Error("Perplexity requires at least one non-system message")
  }

  // Ensure alternating user/assistant roles
  const cleanedMessages: Message[] = []
  let lastRole: string | null = null

  for (const msg of conversationMessages) {
    // Skip consecutive same-role messages
    if (msg.role === lastRole) {
      console.warn(`⚠️ Perplexity: Skipping consecutive ${msg.role} message`)
      continue
    }
    
    // First message must be user
    if (cleanedMessages.length === 0 && msg.role !== "user") {
      console.warn(`⚠️ Perplexity: Skipping first ${msg.role} message, need user first`)
      continue
    }

    cleanedMessages.push(msg)
    lastRole = msg.role
  }

  if (cleanedMessages.length === 0) {
    throw new Error("No valid conversation messages after cleaning")
  }

  // Last message must be user
  if (cleanedMessages[cleanedMessages.length - 1].role !== "user") {
    throw new Error("Perplexity requires the last message to be from user")
  }

  // Build final message array
  // If we have system content, prepend it to the FIRST user message instead of separate system role
  // This ensures better context retention
  if (mergedSystemContent) {
    // Prepend system content to first user message
    const firstUserMsg = cleanedMessages[0]
    perplexityMessages.push({
      role: "user",
      content: `${mergedSystemContent}\n\n---\n\n${firstUserMsg.content}`
    })
    
    // Add remaining messages
    for (let i = 1; i < cleanedMessages.length; i++) {
      perplexityMessages.push(cleanedMessages[i])
    }
    
    console.log("✅ Perplexity: System context merged into first user message")
  } else {
    // No system message, use messages as-is
    perplexityMessages.push(...cleanedMessages)
  }

  return perplexityMessages
}

/**
 * Chat with Perplexity Sonar model
 */
export async function chatWithPerplexity(request: ChatRequest): Promise<ChatResponse> {
  const { messages, apiKey, temperature = 0.7, maxTokens = 2048 } = request

  if (!apiKey) {
    throw new Error("Perplexity API key is required")
  }

  console.log("========== PERPLEXITY INPUT ==========")
  console.log("📥 Input messages count:", messages.length)
  console.log("📋 Message roles:", messages.map(m => m.role).join(" -> "))
  
  // Log system messages specifically
  const systemMsgs = messages.filter(m => m.role === "system")
  if (systemMsgs.length > 0) {
    console.log("🔍 System messages found:", systemMsgs.length)
    systemMsgs.forEach((msg, idx) => {
      const preview = msg.content.substring(0, 150).replace(/\n/g, " ")
      console.log(`  System ${idx + 1}: ${preview}...`)
    })
  }
  console.log("=======================================")

  // Convert to Perplexity format
  const perplexityMessages = convertToPerplexityFormat(messages)

  console.log("========== PERPLEXITY API CALL ==========")
  console.log("📤 Final message count:", perplexityMessages.length)
  console.log("📋 Final roles:", perplexityMessages.map(m => m.role).join(" -> "))
  perplexityMessages.forEach((msg, idx) => {
    const preview = msg.content.substring(0, 100).replace(/\n/g, " ")
    console.log(`  ${idx + 1}. ${msg.role}: ${preview}...`)
  })
  console.log("=========================================")

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "sonar",
      messages: perplexityMessages,
      temperature,
      max_tokens: maxTokens,
      return_citations: true,
      return_images: false,
    }),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    console.error("❌ Perplexity API error:", errorData)
    throw new Error(
      `Perplexity API error: ${errorData.error?.message || errorData.message || response.statusText}`
    )
  }

  const data = await response.json()

  if (!data.choices || data.choices.length === 0) {
    throw new Error("No response generated from Perplexity")
  }

  let content = data.choices[0]?.message?.content || "No response generated"
  
  // Clean up response - remove citations and trailing text
  content = content.replace(/\[\d+\]/g, "").trim()
  content = content.replace(/\s+perplexity\s*$/i, "").trim()

  console.log("✅ Perplexity response received, length:", content.length)

  return {
    content,
    model: "sonar",
    tokensUsed: data.usage?.total_tokens,
    timestamp: new Date().toISOString(),
  }
}


