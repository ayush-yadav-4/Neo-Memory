import mongoose, { Schema, type Document } from "mongoose"

export interface Message {
  role: "user" | "assistant" | "system"
  content: string
  timestamp: Date
  model?: string
}

export interface IConversation extends Document {
  userId: string | mongoose.Types.ObjectId
  title: string
  messages: Message[]
  currentModel?: string
  fileContexts: Message[]
  createdAt: Date
  updatedAt: Date
}

const messageSchema = new Schema<Message>(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    model: {
      type: String,
    },
  },
  { _id: false },
)

const conversationSchema = new Schema<IConversation>(
  {
    userId: {
      type: String, // Accept both string and ObjectId
      required: true,
    },
    title: {
      type: String,
      required: true,
      default: "New Conversation",
    },
    messages: {
      type: [messageSchema],
      default: [],
    },
    currentModel: {
      type: String,
    },
    fileContexts: {
      type: [messageSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
)

// Create indexes for faster queries
conversationSchema.index({ userId: 1 })
conversationSchema.index({ userId: 1, createdAt: -1 })

export const Conversation =
  mongoose.models.Conversation || mongoose.model<IConversation>("Conversation", conversationSchema)

