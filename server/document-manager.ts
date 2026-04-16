import { getEmbedding } from "./embeddings"
import { upsertDocumentVector, searchDocumentVectors, createDocumentCollection } from "./qdrant-documents"
import { connectDB } from "./db"
import { Document } from "./models/Document"
import { createRequire } from "module"
import { fileURLToPath } from "url"

const require = createRequire(fileURLToPath(import.meta.url))

const DOCUMENT_COLLECTION_NAME = "document_chunks"

async function extractTextFromPDF(fileBuffer: Buffer): Promise<string> {
  try {
    let pdfParse: any
    
    try {
      const pdfModule = await import("pdf-parse")
      pdfParse = pdfModule.default || pdfModule
      
      if (typeof pdfParse !== 'function') {
        const pdfRequire = require("pdf-parse")
        pdfParse = pdfRequire.default || pdfRequire
      }
    } catch (importError) {
      const pdfRequire = require("pdf-parse")
      pdfParse = pdfRequire.default || pdfRequire
    }
    
    if (typeof pdfParse !== 'function') {
      throw new Error(
        `pdf-parse is not a function. ` +
        `Got type: ${typeof pdfParse}. ` +
        `Please ensure pdf-parse@1.1.1 is installed and restart the server.`
      )
    }
    
    const data = await pdfParse(fileBuffer)
    
    if (data && typeof data === 'object' && data.text) {
      return data.text
    } else if (typeof data === 'string') {
      return data
    } else {
      throw new Error(`Unexpected response format from pdf-parse. Got type: ${typeof data}`)
    }
  } catch (error: any) {
    console.error('PDF extraction error:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n')
    })
    throw new Error(`Failed to extract PDF text: ${error.message}`)
  }
}


async function extractTextFromDOCX(fileBuffer: Buffer): Promise<string> {
  try {
    const mammoth = require("mammoth")
    const result = await mammoth.extractRawText({ buffer: fileBuffer })
    return result.value
  } catch (error: any) {
    throw new Error(`Failed to extract DOCX text: ${error.message}`)
  }
}

function extractTextFromTXT(fileBuffer: Buffer): string {
  return fileBuffer.toString("utf-8")
}

export async function extractTextFromFile(fileBuffer: Buffer, fileType: string): Promise<string> {
  switch (fileType.toLowerCase()) {
    case "pdf":
      return await extractTextFromPDF(fileBuffer)
    case "docx":
    case "doc":
      return await extractTextFromDOCX(fileBuffer)
    case "txt":
    case "text":
      return extractTextFromTXT(fileBuffer)
    case "md":
    case "markdown":
      return extractTextFromTXT(fileBuffer)
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

export function chunkText(text: string, chunkSize: number = 1000, overlap: number = 100): Array<{ text: string; startIndex: number; endIndex: number }> {
  const chunks: Array<{ text: string; startIndex: number; endIndex: number }> = []
  
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
  
  let currentChunk = ""
  let startIndex = 0
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]
    
    if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        startIndex,
        endIndex: startIndex + currentChunk.length,
      })
      
      const overlapText = currentChunk.slice(-overlap)
      currentChunk = overlapText + sentence
      startIndex = startIndex + currentChunk.length - sentence.length - overlap
    } else {
      currentChunk += sentence
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      startIndex,
      endIndex: startIndex + currentChunk.length,
    })
  }
  
  return chunks
}

export async function storeDocument(
  userId: string,
  filename: string,
  originalName: string,
  fileType: string,
  fileSize: number,
  fileBuffer: Buffer
): Promise<string> {
  try {
    const textContent = await extractTextFromFile(fileBuffer, fileType)
    
    if (!textContent || textContent.trim().length === 0) {
      throw new Error("No text content extracted from document")
    }
    
    const chunks = chunkText(textContent, 1000, 100)
    
    await createDocumentCollection(DOCUMENT_COLLECTION_NAME).catch((err) => {
      console.warn("Could not create document Qdrant collection:", err.message)
    })
    
    await connectDB()
    
    console.log(`[Document Upload] Processing ${chunks.length} chunks for document "${originalName}"`)
    
    const chunkPromises = chunks.map(async (chunk, index) => {
      try {
        const embedding = await getEmbedding(chunk.text)
        
        if (!embedding || embedding.length === 0) {
          console.warn(`[Document Upload] No embedding generated for chunk ${index}`)
          throw new Error('Failed to generate embedding')
        }
        
        const pointId = `${userId}_${filename}_chunk_${index}`
        await upsertDocumentVector(
          DOCUMENT_COLLECTION_NAME,
          pointId,
          embedding,
          {
            userId: String(userId), 
            filename,
            originalName,
            chunkId: index,
            text: chunk.text,
            startIndex: chunk.startIndex,
            endIndex: chunk.endIndex,
          }
        ).catch((err) => {
          console.error(`[Document Upload] Could not store chunk ${index} vector:`, err.message)
          throw err 
        })
        
        console.log(`[Document Upload] Successfully stored chunk ${index + 1}/${chunks.length} in Qdrant`)
        
        return {
          id: index,
          text: chunk.text,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
          embedding: embedding.length > 0 ? embedding : undefined,
        }
      } catch (error: any) {
        console.error(`[Document Upload] Error processing chunk ${index}:`, error.message)
        return {
          id: index,
          text: chunk.text,
          startIndex: chunk.startIndex,
          endIndex: chunk.endIndex,
        }
      }
    })
    
    const processedChunks = await Promise.all(chunkPromises)
    console.log(`[Document Upload] Processed ${processedChunks.length} chunks, ready for chat`)
    
    // Store document in MongoDB
    const document = await Document.create({
      userId: userId as any,
      filename,
      originalName,
      fileType,
      fileSize,
      textContent,
      chunks: processedChunks,
      metadata: {
        wordCount: textContent.split(/\s+/).length,
        extractedAt: new Date(),
      },
    })
    
    return document._id.toString()
  } catch (error: any) {
    console.error("Error storing document:", error)
    throw error
  }
}

export async function searchDocumentChunks(
  userId: string,
  query: string,
  filename?: string,
  topK: number = 10
): Promise<string[]> {
  try {
    console.log(`[Document Search] Starting search - userId: ${userId}, filename: ${filename}, query: "${query.slice(0, 50)}..."`)
    
    const embedding = await getEmbedding(query)
    
    if (!embedding || embedding.length === 0) {
      console.error('[Document Search] Failed to generate embedding for query')
      return []
    }
    
    console.log(`[Document Search] Generated embedding of size ${embedding.length}`)
    
    const results = await searchDocumentVectors(DOCUMENT_COLLECTION_NAME, embedding, topK * 2, 0.3)
    
    console.log(`[Document Search] Qdrant returned ${results.length} results`)
    
    const filtered = results
      .filter((result: any) => {
        const payload = result.payload
        if (!payload) {
          console.warn('[Document Search] Result has no payload')
          return false
        }
        
        const payloadUserId = String(payload.userId || '')
        const searchUserId = String(userId || '')
        if (payloadUserId !== searchUserId) {
          console.warn(`[Document Search] UserId mismatch: payload="${payloadUserId}", search="${searchUserId}"`)
          return false
        }
        
        if (filename) {
          const payloadFilename = payload.filename || payload.originalName || ''
          if (payloadFilename !== filename && payload.originalName !== filename) {
            console.warn(`[Document Search] Filename mismatch: payload="${payloadFilename}", search="${filename}"`)
            return false
          }
        }
        
        return true
      })
      .map((result: any) => ({
        text: result.payload?.text || "",
        score: result.score || 0
      }))
      .filter((item: any) => item.text.length > 0)
      .sort((a: any, b: any) => b.score - a.score) // Sort by score descending
      .slice(0, topK) 
      .map((item: any) => item.text)
    
    console.log(`[Document Search] Query: "${query.slice(0, 50)}...", Found ${filtered.length} chunks out of ${results.length} results`)
    
    return filtered
  } catch (error: any) {
    console.error("Error searching document chunks:", error)
    return []
  }
}

export async function listDocuments(userId: string, limit: number = 50) {
  try {
    await connectDB()
    const documents = await Document.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("_id filename originalName fileType fileSize createdAt metadata")
    
    return documents
  } catch (error) {
    console.error("Error listing documents:", error)
    return []
  }
}

export async function getDocument(userId: string, documentId: string) {
  try {
    await connectDB()
    const document = await Document.findOne({
      _id: documentId,
      userId,
    })
    
    return document
  } catch (error) {
    console.error("Error getting document:", error)
    return null
  }
}

export async function deleteDocument(userId: string, documentId: string): Promise<boolean> {
  try {
    await connectDB()
    
    const document = await Document.findOne({ _id: documentId, userId })
    if (!document) return false
    
    
    await Document.deleteOne({ _id: documentId, userId })
    
    return true
  } catch (error) {
    console.error("Error deleting document:", error)
    return false
  }
}

