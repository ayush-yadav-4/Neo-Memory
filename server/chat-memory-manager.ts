import { getEmbedding } from "./embeddings"
import { upsertVector, searchVectors, createCollection } from "./qdrant"
import { connectDB } from "./db"
import { Memory } from "./models/Memory"

const COLLECTION_NAME = "chat_memories"

export async function storeChatMemory(userId: string, text: string, source = "chat"): Promise<string> {
  try {
 
    await createCollection(COLLECTION_NAME).catch((err) => {
      console.warn("Could not create Qdrant collection:", err.message)
    })


    let embedding: number[] = []
    try {
      embedding = await getEmbedding(text)
    } catch (err) {
      console.warn("Could not get embedding, storing without vector:", err)
    }

    await connectDB()

   
    const memory = await Memory.create({
      userId: userId as any,
      text,
      source,
      embedding: embedding.length > 0 ? embedding : undefined,
    })

    // Also store in Qdrant for vector search (non-blocking)
    if (embedding.length > 0) {
      await upsertVector(COLLECTION_NAME, memory._id.toString(), embedding, {
        userId,
        text,
        source,
        timestamp: new Date().toISOString(),
      }).catch((err) => {
        console.warn("Could not store vector in Qdrant:", err.message)
      })
    }

    return memory._id.toString()
  } catch (error) {
    console.error("Error storing chat memory:", error)
    throw error
  }
}

export async function retrieveChatMemory(userId: string, query: string, topK = 5): Promise<string[]> {
  try {
    const embedding = await getEmbedding(query)

    // Search in Qdrant (non-blocking - returns empty array if fails)
    const results = await searchVectors(COLLECTION_NAME, embedding, topK).catch((err) => {
      console.warn("Qdrant search failed (non-blocking), falling back to MongoDB:", err.message)
      return []
    })

    // Filter by userId and extract text
    const qdrantResults = results
      .filter((result: any) => result.payload?.userId === userId)
      .map((result: any) => result.payload?.text || "")
      .filter((text: string) => text.length > 0)

    // If Qdrant search failed or returned no results, try MongoDB fallback
    if (qdrantResults.length === 0) {
      try {
        await connectDB()
        // Simple text search in MongoDB as fallback
        const memories = await Memory.find({ 
          userId: userId as any,
          text: { $regex: query, $options: 'i' }
        })
        .sort({ createdAt: -1 })
        .limit(topK)
        
        return memories.map(m => m.text).filter((text: string) => text.length > 0)
      } catch (mongoError) {
        console.warn("MongoDB fallback search failed:", mongoError)
        return []
      }
    }

    return qdrantResults
  } catch (error) {
    console.error("Error retrieving chat memory:", error)
    // Try MongoDB fallback even if embedding generation failed
    try {
      await connectDB()
      const memories = await Memory.find({ 
        userId: userId as any,
        text: { $regex: query, $options: 'i' }
      })
      .sort({ createdAt: -1 })
      .limit(topK)
      
      return memories.map(m => m.text).filter((text: string) => text.length > 0)
    } catch (fallbackError) {
      console.warn("All memory retrieval methods failed:", fallbackError)
      return []
    }
  }
}

export async function listChatMemories(userId: string, limit = 50) {
  try {
    await connectDB()

    const memories = await Memory.find({ userId }).sort({ createdAt: -1 }).limit(limit)

    return memories
  } catch (error) {
    console.error("Error listing chat memories:", error)
    return []
  }
}

export async function deleteChatMemory(userId: string, memoryId: string) {
  try {
    await connectDB()

    const result = await Memory.deleteOne({
      _id: memoryId,
      userId,
    })

    return result.deletedCount > 0
  } catch (error) {
    console.error("Error deleting chat memory:", error)
    return false
  }
}

export async function clearUserChatMemories(userId: string) {
  try {
    await connectDB()

    const result = await Memory.deleteMany({ userId })

    return result.deletedCount
  } catch (error) {
    console.error("Error clearing chat memories:", error)
    return 0
  }
}

export async function getRelevantMemories(
  userId: string,
  query: string,
  dashboardApiKey?: string,
  limit: number = 10
): Promise<Array<{ content: string; score: number; source: string }>> {
  const allMemories: Array<{ content: string; score: number; source: string }> = [];
  
  try {
    // Get memories from chat
    try {
      const chatMemories = await retrieveChatMemory(userId, query, Math.floor(limit / 2));
      const formattedChatMemories = chatMemories.map((text) => ({
        content: text,
        score: 0.5,
        source: 'chat',
      }));
      allMemories.push(...formattedChatMemories);
    } catch (error: any) {
      console.warn('[Memory] Chat retrieval failed:', error.message);
    }
    
    // Get memories from dashboard API if key provided
    if (dashboardApiKey) {
      try {
        const response = await fetch('http://localhost:8787/retrieve-memories', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': dashboardApiKey,
          },
          body: JSON.stringify({ query, limit: Math.floor(limit / 2) }),
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.memories && Array.isArray(data.memories)) {
            const dashboardMemories = data.memories.map((m: any) => ({
              content: m.content || '',
              score: m.similarity || 0,
              source: 'dashboard',
            }));
            allMemories.push(...dashboardMemories);
          }
        }
      } catch (error: any) {
        console.warn('[Memory] Dashboard retrieval failed:', error.message);
      }
    }
    
    allMemories.sort((a, b) => b.score - a.score);
    return allMemories.slice(0, limit);
  } catch (error: any) {
    console.error('[Memory] Get relevant memories error:', error.message);
    return [];
  }
}

