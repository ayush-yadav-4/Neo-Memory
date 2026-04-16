import mongoose, { Schema, type Document } from "mongoose"

export interface IMemory extends Document {
  userId: string | mongoose.Types.ObjectId
  text?: string
  source?: string
  embedding?: number[]
  title?: string
  content?: string
  summary?: string
  sourceType?: string
  sourceUrl?: string
  qdrantId?: string
  spaceId?: mongoose.Types.ObjectId
  metadata?: Record<string, any>
  tags?: string[]
  accessCount?: number
  lastAccessedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const memorySchema = new Schema<IMemory>(
  {
    userId: {
      type: Schema.Types.Mixed, // Accept both string and ObjectId
      required: true,
    },
    text: {
      type: String,
    },
    source: {
      type: String,
      default: "chat",
    },
    embedding: {
      type: [Number],
    },
    title: {
      type: String,
    },
    content: {
      type: String,
    },
    summary: {
      type: String,
    },
    sourceType: {
      type: String,
    },
    sourceUrl: {
      type: String,
    },
    qdrantId: {
      type: String,
    },
    spaceId: {
      type: Schema.Types.ObjectId,
      ref: "Space",
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    tags: {
      type: [String],
      default: [],
    },
    accessCount: {
      type: Number,
      default: 0,
    },
    lastAccessedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Create index for userId for faster queries
memorySchema.index({ userId: 1 })

export const Memory = mongoose.models.Memory || mongoose.model<IMemory>("Memory", memorySchema)

