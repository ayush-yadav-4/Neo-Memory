import { getEmbeddingDimension } from "./embeddings"

export const initDocumentQdrantClient = () => {
  const apiUrl = "https://7b85ae9b-a2a9-4050-9303-bc4ddd116cf2.us-west-1-0.aws.cloud.qdrant.io:6333"
  const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3MiOiJtIn0.eAW7daWX1qQIvsyZO0HpgcTIIStSbGdKyU2uOhwUiyg"

  return {
    url: apiUrl,
    apiKey: apiKey,
  }
}

export async function upsertDocumentVector(
  collectionName: string,
  pointId: string,
  vector: number[],
  payload: Record<string, unknown>,
) {
  const client = initDocumentQdrantClient()

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
    console.error("Document Qdrant upsert error:", errorText)
    throw new Error(`Failed to upsert document vector: ${response.statusText}`)
  }

  return await response.json()
}

export async function searchDocumentVectors(collectionName: string, vector: number[], limit = 5, scoreThreshold = 0.5) {
  const client = initDocumentQdrantClient()

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
    const errorText = await response.text()
    console.error("Document Qdrant search error:", errorText)
    throw new Error(`Failed to search document vectors: ${response.statusText}`)
  }

  const data = await response.json()
  return data.result || []
}

export async function createDocumentCollection(collectionName: string) {
  const client = initDocumentQdrantClient()
  const vectorSize = getEmbeddingDimension()

  console.log(`📊 Creating document collection with vector dimension: ${vectorSize}`)

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
    const errorText = await response.text()
    console.error("Document Qdrant collection creation error:", errorText)
    throw new Error(`Failed to create document collection: ${response.statusText}`)
  }

  return await response.json()
}

