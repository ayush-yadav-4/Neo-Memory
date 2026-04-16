import { getEmbeddingDimension } from "./embeddings"

export const initQdrantClient = () => {
  const apiUrl = import.meta.env.VITE_QDRANT_API_URL || process.env.QDRANT_API_URL
  const apiKey = import.meta.env.VITE_QDRANT_API_KEY || process.env.QDRANT_API_KEY

  if (!apiUrl || !apiKey) {
    throw new Error("Qdrant environment variables not configured")
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

  
  let numericId: number | string = pointId
  if (typeof pointId === "string") {
  
    numericId = pointId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  }

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
    throw new Error(`Failed to upsert vector: ${response.statusText}`)
  }

  return await response.json()
}

export async function searchVectors(collectionName: string, vector: number[], limit = 5, scoreThreshold = 0.5) {
  const client = initQdrantClient()

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
    throw new Error(`Failed to search vectors: ${response.statusText}`)
  }

  const data = await response.json()
  return data.result || []
}

export async function createCollection(collectionName: string) {
  const client = initQdrantClient()
  const vectorSize = getEmbeddingDimension()

  console.log(` Using vector dimension: ${vectorSize}`)

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
    throw new Error(`Failed to create collection: ${response.statusText}`)
  }

  return await response.json()
}

