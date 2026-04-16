import { retryWithBackoff } from "./utils/retry"


export async function getEmbedding(text: string): Promise<number[]> {
  const provider = process.env.EMBEDDING_PROVIDER || "huggingface"

  try {
    switch (provider.toLowerCase()) {
      case "huggingface":
        return await retryWithBackoff(() => getHuggingFaceEmbedding(text))

      case "cohere":
        return await retryWithBackoff(() => getCohereEmbedding(text))

      case "gemini":
        return await retryWithBackoff(() => getGeminiEmbedding(text))

      default:
        console.warn(`Unknown provider "${provider}", defaulting to HuggingFace`)
        return await retryWithBackoff(() => getHuggingFaceEmbedding(text))
    }
  } catch (error: any) {
    console.error(`❌ Embedding error with ${provider}:`, error.message)

    if (provider !== "cohere" && process.env.COHERE_API_KEY) {
      console.log("🔄 Falling back to Cohere...")
      try {
        return await retryWithBackoff(() => getCohereEmbedding(text))
      } catch (fallbackError) {
        console.error("❌ Cohere fallback failed:", (fallbackError as any).message)
      }
    }

    if (provider !== "gemini" && process.env.GEMINI_API_KEY) {
      console.log("🔄 Falling back to Gemini...")
      try {
        return await retryWithBackoff(() => getGeminiEmbedding(text))
      } catch (fallbackError) {
        console.error(" Gemini fallback failed:", (fallbackError as any).message)
      }
    }

    console.error(" All embedding providers failed, returning empty array")
    const dimension = getEmbeddingDimension()
    return new Array(dimension).fill(0)
  }
}


async function getHuggingFaceEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY || "hf_YOUR_HUGGINGFACE_API_KEY_HERE"
  
  if (!apiKey || apiKey === "hf_YOUR_HUGGINGFACE_API_KEY_HERE") {
    throw new Error("HUGGINGFACE_API_KEY not configured")
  }

  const response = await fetch(
    "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: text,
      }),
    },
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HuggingFace: ${errorText}`)
  }

  const data = await response.json()
  return Array.isArray(data) ? data : data.embeddings || data
}

async function getCohereEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.COHERE_API_KEY || "Z6OW9Khqf4GsBCrWxHCJZWO3ww5lSPy11oWPGw8U"
  
  if (!apiKey || apiKey === "YOUR_COHERE_API_KEY_HERE") {
    throw new Error("COHERE_API_KEY not configured")
  }

  const response = await fetch("https://api.cohere.ai/v1/embed", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      texts: [text],
      model: "embed-english-light-v3.0",
      input_type: "search_document",
      truncate: "END",
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Cohere: ${error.message || "Unknown error"}`)
  }

  const data = await response.json()
  return data.embeddings[0]
}

async function getGeminiEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured")
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: { parts: [{ text }] },
      }),
    },
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Gemini: ${error.error?.message || "Unknown error"}`)
  }

  const data = await response.json()
  return data.embedding.values
}

  
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map((text) => getEmbedding(text)))
}


export function getEmbeddingDimension(): number {
  const provider = process.env.EMBEDDING_PROVIDER || "huggingface"

  switch (provider.toLowerCase()) {
    case "gemini":
      return 768
    case "cohere":
    case "huggingface":
      return 384
    default:
      return 384
  }
}

