import mongoose from "mongoose"

export interface IDocument extends mongoose.Document {
  userId: string | mongoose.Types.ObjectId
  filename: string
  originalName: string
  fileType: string // 'pdf', 'docx', 'txt', 'md'
  fileSize: number // in bytes
  filePath?: string // if storing files locally
  textContent: string // extracted text
  chunks: Array<{
    id: number
    text: string
    startIndex: number
    endIndex: number
    embedding?: number[]
  }>
  metadata?: {
    pageCount?: number
    wordCount?: number
    extractedAt: Date
  }
  createdAt: Date
  updatedAt: Date
}

const documentSchema = new mongoose.Schema<IDocument>(
  {
    userId: { type: mongoose.Schema.Types.Mixed, required: true },
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    filePath: String,
    textContent: { type: String, required: true },
    chunks: [
      {
        id: Number,
        text: String,
        startIndex: Number,
        endIndex: Number,
        embedding: [Number],
      },
    ],
    metadata: {
      pageCount: Number,
      wordCount: Number,
      extractedAt: Date,
    },
  },
  { timestamps: true }
)

export const Document = mongoose.models.Document || mongoose.model<IDocument>("Document", documentSchema)

