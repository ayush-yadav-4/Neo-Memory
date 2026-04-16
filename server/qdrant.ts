import { getEmbeddingDimension } from "./embeddings"

export const initQdrantClient = () => {
  const apiUrl = process.env.QDRANT_API_URL || "https://YOUR_QDRANT_URL_HERE"
  const apiKey = process.env.QDRANT_API_KEY || "YOUR_QDRANT_API_KEY_HERE"

  if (!apiUrl || !apiKey || apiUrl === "https://YOUR_QDRANT_URL_HERE" || apiKey === "YOUR_QDRANT_API_KEY_HERE") {
    return null
  }

  return {
    url: apiUrl,
    apiKey: apiKey,
  }
}

export async function upsertVector(
  collectionName: string,
  pointId: string,
  vector: number[],
  payload: Record<string, unknown>,
) {
  const client = initQdrantClient()
  
  if (!client) {
    console.warn("Qdrant not configured, skipping vector upsert")
    return null
  }

  let numericId: number | string = pointId
  if (typeof pointId === "string") {
    numericId = pointId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  }

  try {
    const response = await fetch(`${client.url}/collections/${collectionName}/points`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "api-key": client.apiKey,
      },
      body: JSON.stringify({
        points: [
          {
            id: numericId,
            vector: vector,
            payload: payload,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Qdrant upsert error:", errorText)
      return null
    }

    return await response.json()
  } catch (error: any) {
    console.warn("Qdrant upsert failed (non-blocking):", error.message)
    return null
  }
}

export async function searchVectors(collectionName: string, vector: number[], limit = 5, scoreThreshold = 0.5) {
  const client = initQdrantClient()
  
  if (!client) {
    console.warn("Qdrant not configured, returning empty search results")
    return []
  }

  try {
    const response = await fetch(`${client.url}/collections/${collectionName}/points/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": client.apiKey,
      },
      body: JSON.stringify({
        vector: vector,
        limit: limit,
        score_threshold: scoreThreshold,
      }),
    })

    if (!response.ok) {
      console.warn(`Qdrant search failed: ${response.statusText}`)
      return []
    }

    const data = await response.json()
    return data.result || []
  } catch (error: any) {
    console.warn("Qdrant search failed (non-blocking):", error.message)
    return []
  }
}

export async function createCollection(collectionName: string) {
  const client = initQdrantClient()
  
  if (!client) {
    console.warn("Qdrant not configured, skipping collection creation")
    return null
  }
  
  const vectorSize = getEmbeddingDimension()

  console.log(`📊 Using vector dimension: ${vectorSize}`)

  try {
    const response = await fetch(`${client.url}/collections/${collectionName}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "api-key": client.apiKey,
      },
      body: JSON.stringify({
        vectors: {
          size: vectorSize,
          distance: "Cosine",
        },
      }),
    })

    if (!response.ok && response.status !== 409) {
      console.warn(`Qdrant collection creation failed: ${response.statusText}`)
      return null
    }

    return await response.json()
  } catch (error: any) {
    console.warn("Qdrant collection creation failed (non-blocking):", error.message)
    return null
  }
}

