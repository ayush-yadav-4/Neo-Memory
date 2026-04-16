"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Send, Loader, File, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModelSelector, type ModelProvider } from "@/components/chat/ModelSelector"
import { DocumentUpload } from "./DocumentUpload"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  model?: string
}

interface Document {
  _id: string
  filename: string
  originalName: string
  fileType: string
  fileSize: number
  createdAt: string
}

interface Conversation {
  _id: string
  title: string
  messages: Message[]
  currentModel?: string
  createdAt: string
}

export function DocumentChatInterface() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ModelProvider>("gemini-1.5")
  const [selectedApiKey, setSelectedApiKey] = useState("")
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showSidebar, setShowSidebar] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (activeConversation) {
      loadConversation(activeConversation)
    }
  }, [activeConversation])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadConversations = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/api/conversations/list`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error("Error loading conversations:", error)
    }
  }

  const loadConversation = async (conversationId: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/api/conversations/${conversationId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const messagesWithDates = (data.conversation.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp) : msg.timestamp,
        }))
        setMessages(messagesWithDates)
        if (data.conversation.currentModel) {
          setSelectedModel(data.conversation.currentModel as ModelProvider)
        }
      }
    } catch (error) {
      console.error("Error loading conversation:", error)
    }
  }

  const createNewConversation = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/api/conversations/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          title: "New Document Chat",
        }),
      })
      if (response.ok) {
        const data = await response.json()
        await loadConversations()
        setActiveConversation(data.conversation._id)
        setMessages([])
      }
    } catch (error) {
      console.error("Error creating conversation:", error)
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      await fetch(`${apiBase}/api/conversations/${conversationId}`, {
        method: "DELETE",
        credentials: 'include',
      })
      await loadConversations()
      if (activeConversation === conversationId) {
        setActiveConversation(null)
        setMessages([])
      }
    } catch (error) {
      console.error("Error deleting conversation:", error)
    }
  }

  const handleModelSelect = (provider: ModelProvider, apiKey: string) => {
    setSelectedModel(provider)
    setSelectedApiKey(apiKey)
    if (activeConversation) {
      updateConversationModel(activeConversation, provider)
    }
  }

  const updateConversationModel = async (conversationId: string, model: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      await fetch(`${apiBase}/api/conversations/${conversationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({ currentModel: model }),
      })
    } catch (error) {
      console.error("Error updating model:", error)
    }
  }

  const handleDocumentSelected = (documentId: string | null) => {
    setSelectedDocumentId(documentId)
    if (documentId) {
      // Load document details
      loadDocumentDetails(documentId)
    } else {
      setSelectedDocument(null)
    }
  }

  const loadDocumentDetails = async (documentId: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/api/documents/${documentId}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setSelectedDocument(data.document)
      }
    } catch (error) {
      console.error("Error loading document details:", error)
    }
  }

  const handleDocumentUploaded = (document: Document) => {
    setSelectedDocument(document)
    setSelectedDocumentId(document._id)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !selectedApiKey || !selectedDocumentId) return

    // Ensure we have an active conversation
    let currentConversationId = activeConversation
    if (!currentConversationId) {
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
        const response = await fetch(`${apiBase}/api/conversations/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          body: JSON.stringify({
            title: selectedDocument?.originalName || "Document Chat",
          }),
        })
        if (response.ok) {
          const data = await response.json()
          currentConversationId = data.conversation._id
          setActiveConversation(currentConversationId)
          await loadConversations()
        }
      } catch (error) {
        console.error("Error creating conversation:", error)
        return
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    }

    setInput("")
    setIsLoading(true)

    // Optimistically add user message to UI
    setMessages((prev) => {
      const updatedMessages = [...prev, userMessage]

      // Send the request immediately with the updated messages
      const messagesForAPI = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))

      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      fetch(`${apiBase}/api/documents/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: messagesForAPI,
          provider: selectedModel,
          apiKey: selectedApiKey,
          conversationId: currentConversationId,
          documentId: selectedDocumentId,
        }),
      })
        .then(async response => {
          const data = await response.json()

          if (!response.ok) {
            throw new Error(data.error || "Failed to get response")
          }

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: data.message,
            timestamp: new Date(),
            model: selectedModel,
          }

          setMessages((curr) => [...curr, assistantMessage])
        })
        .catch((error) => {
          console.error("Error sending message:", error)
          const errorMessage: Message = {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            timestamp: new Date(),
          }
          setMessages((curr) => [...curr, errorMessage])
        })
        .finally(() => {
          setIsLoading(false)
        })

      return updatedMessages
    })
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/Neomemory-logo.png" alt="Neo Memory Logo" className="w-12 h-12" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Talk with File
              </h1>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="text-slate-300 hover:text-white hover:bg-slate-800"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Document Upload Sidebar */}
        {showSidebar && (
          <div className="w-80 border-r border-slate-800 bg-slate-900/50 p-4 overflow-y-auto">
            <div className="mb-4">
              <button
                onClick={createNewConversation}
                className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <MessageSquare className="w-4 h-4" />
                New Conversation
              </button>
            </div>

            <div className="mb-4">
              <DocumentUpload
                onDocumentUploaded={handleDocumentUploaded}
                onDocumentSelected={handleDocumentSelected}
                selectedDocumentId={selectedDocumentId}
              />
            </div>

            {/* Selected Document Info */}
            {selectedDocument && (
              <div className="mt-4 p-3 rounded-lg bg-blue-500/20 border border-blue-500">
                <div className="flex items-center gap-2 mb-2">
                  <File className="w-4 h-4 text-blue-400" />
                  <p className="text-sm font-medium text-blue-300">Active Document</p>
                </div>
                <p className="text-xs text-slate-300 truncate">{selectedDocument.originalName}</p>
              </div>
            )}

            {/* Conversations List */}
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-300 mb-2">Recent Conversations</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {conversations.map((conversation) => (
                  <div
                    key={conversation._id}
                    onClick={() => setActiveConversation(conversation._id)}
                    className={`p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                      activeConversation === conversation._id
                        ? "bg-blue-500/20 border border-blue-500"
                        : "hover:bg-slate-800 border border-transparent"
                    }`}
                  >
                    <p className="text-slate-200 truncate">{conversation.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="border-b border-slate-800 p-4 flex items-center justify-between bg-slate-900/50">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-300"
            >
              <File className="w-5 h-5" />
            </button>
            <div className="text-sm text-slate-400">
              {selectedDocument 
                ? `Chatting with: ${selectedDocument.originalName}` 
                : "Please upload a document to start"}
            </div>
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Model Selector Sidebar */}
            <div className="w-80 border-r border-slate-800 bg-slate-900/50 p-4 overflow-y-auto">
              <ModelSelector onModelSelect={handleModelSelect} selectedModel={selectedModel} />
            </div>

            {/* Chat Interface */}
            <div className="flex-1 flex flex-col bg-slate-950">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="text-center">
                      <File className="w-16 h-16 mx-auto mb-4 text-slate-600" />
                      <p className="mb-2 text-lg">Upload a document to start chatting</p>
                      <p className="text-sm text-slate-500">
                        {selectedDocument 
                          ? "Ask questions about the document"
                          : "Select a document from the sidebar"}
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className="flex items-center justify-between gap-2 mt-2">
                          {msg.model && <p className="text-xs opacity-70 capitalize">{msg.model}</p>}
                          <p className="text-xs opacity-70">
                            {msg.timestamp instanceof Date 
                              ? msg.timestamp.toLocaleTimeString() 
                              : new Date(msg.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 text-slate-200 px-4 py-3 rounded-lg rounded-bl-none border border-slate-700">
                      <Loader className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <form onSubmit={handleSendMessage} className="border-t border-slate-800 p-4 bg-slate-900/50">
                {!selectedApiKey && (
                  <p className="text-xs text-red-400 mb-2">Please select a model and add its API key</p>
                )}
                {!selectedDocumentId && (
                  <p className="text-xs text-orange-400 mb-2">Please upload and select a document</p>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={selectedDocumentId ? "Ask a question about the document..." : "Upload a document first..."}
                    disabled={isLoading || !selectedApiKey || !selectedDocumentId}
                    className="flex-1 px-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim() || !selectedApiKey || !selectedDocumentId}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

