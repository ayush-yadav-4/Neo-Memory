"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Send, Loader, Plus, Trash2, MessageSquare, Key, Database, CheckCircle, Eye, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ModelSelector, type ModelProvider } from "./ModelSelector"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  model?: string
}

interface Conversation {
  id: string            // server returns `id`, not `_id`
  title: string
  preview?: string
  messageCount?: number
  messages?: Message[]  // only present when loading a single conversation
  model?: string
  currentModel?: string
  createdAt?: string
  updatedAt?: string
}

interface DashboardMemory {
  id: number
  content: string
  metadata: any
  created_at: string
  updated_at?: string
}

interface ApiKeyListItem {
  id: string
  key: string
  name: string
  is_active: boolean
  usage_count: number
  created_at: string
}

interface ChatInterfaceProps {
  externalConversationId?: string | null;
  onConversationChange?: (id: string | null) => void;
  showFileUpload?: boolean;
}

export function ChatInterface({ externalConversationId, onConversationChange, showFileUpload }: ChatInterfaceProps) {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<ModelProvider>("gemini-1.5")
  const [selectedApiKey, setSelectedApiKey] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showSidebar, setShowSidebar] = useState(true)
  
  // Dashboard API key and memories state
  const [dashboardApiKeys, setDashboardApiKeys] = useState<ApiKeyListItem[]>([])
  const [selectedDashboardApiKey, setSelectedDashboardApiKey] = useState("")
  const [dashboardMemories, setDashboardMemories] = useState<DashboardMemory[]>([])
  const [isFetchingMemories, setIsFetchingMemories] = useState(false)
  const [memoryFetchStatus, setMemoryFetchStatus] = useState<{success: boolean, message: string} | null>(null)
  const [showLoadedMemories, setShowLoadedMemories] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState('');

  useEffect(() => {
    loadConversations()
    loadDashboardApiKeys()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (activeConversation) {
      loadConversation(activeConversation)
    }
  }, [activeConversation])

  useEffect(() => {
    if (externalConversationId && externalConversationId !== activeConversation) {
      loadConversation(externalConversationId);
    }
    if (!externalConversationId && activeConversation) {
      // parent cleared
      setActiveConversation(null);
      setMessages([]);
    }
  }, [externalConversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // FIX Conversation interface (replace the existing one)
  const loadConversations = async () => {
    try {
      const response = await fetch('http://localhost:8787/api/chat/sessions', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        // Server returns { sessions: [ { id, title, preview, messageCount, model, ... } ] }
        setConversations(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }

  const loadConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`http://localhost:8787/api/chat/sessions/${conversationId}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const conv = data.conversation;
        setActiveConversation(conversationId);
        if (Array.isArray(conv.messages)) {
          setMessages(conv.messages.map((m: any, idx: number) => ({
            id: m._id || `${conversationId}-${idx}`,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp),
            model: m.model,
          })));
        }
        setSelectedModel((conv.model || conv.currentModel || 'gemini-1.5') as ModelProvider);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }

  const createNewConversation = () => {
    // Just clear state - new conversation will be created when first message is sent
    setActiveConversation(null);
    setMessages([]);
    console.log('[Frontend] Ready for new conversation');
  }

  // Delete conversation – FIX endpoint and id
  const deleteConversation = async (conversationId: string) => {
    try {
      await fetch(`http://localhost:8787/api/chat/sessions/${conversationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      await loadConversations();
      if (activeConversation === conversationId) {
        setActiveConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
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

  const loadDashboardApiKeys = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/manage-api-keys?action=list`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        setDashboardApiKeys(data.keys || [])
      }
    } catch (error) {
      console.error("Error loading dashboard API keys:", error)
    }
  }

  const fetchDashboardMemories = async () => {
    if (!selectedDashboardApiKey) {
      setMemoryFetchStatus({ success: false, message: 'Please select a Dashboard API key first' })
      return
    }

    setIsFetchingMemories(true)
    setMemoryFetchStatus(null)
    
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      // Fetch all memories (using a high limit)
      const response = await fetch(`${apiBase}/list-memories?limit=1000`, {
        method: 'GET',
        headers: {
          'X-API-Key': selectedDashboardApiKey,
        },
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch memories')
      }

      setDashboardMemories(data.memories || [])
      setMemoryFetchStatus({
        success: true,
        message: `Successfully loaded ${data.memories?.length || 0} memories`
      })
    } catch (error: any) {
      console.error('Error fetching dashboard memories:', error)
      setMemoryFetchStatus({
        success: false,
        message: error.message || 'Failed to fetch memories'
      })
      setDashboardMemories([])
    } finally {
      setIsFetchingMemories(false)
    }
  }

  const sendMessage = async (e?: React.FormEvent) => {
    // Prevent form submission if called from form
    if (e) {
      e.preventDefault();
    }

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      console.log('[Frontend] Sending message to /api/chat');

      // Call the correct /api/chat endpoint
      const response = await fetch('http://localhost:8787/api/chat', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          messages: [...messages, userMessage].map(m => ({ 
            role: m.role, 
            content: m.content 
          })),
          model: selectedModel,
          provider: selectedModel,
          apiKey: selectedApiKey,
          conversationId: activeConversation,
          useMemories: true,
          dashboardApiKey: selectedDashboardApiKey || dashboardApiKeys.find(k => k.is_active)?.key,
        }),
      });

      const data = await response.json();
      
      console.log('[Frontend] Chat response received:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      // Update conversation ID if this was the first message (new conversation)
      if (data.conversationId && !activeConversation) {
        setActiveConversation(data.conversationId);
        console.log('[Frontend] New conversation created:', data.conversationId);
      } else if (data.conversationId) {
        if (!activeConversation || activeConversation !== data.conversationId) {
          setActiveConversation(data.conversationId);
          onConversationChange?.(data.conversationId);
        }
      }

      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.content,
        timestamp: new Date(data.timestamp || new Date()),
        model: data.model,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Refresh conversations list to show the new/updated conversation
      await loadConversations();

    } catch (error: any) {
      console.error('[Frontend] Chat error:', error);
      
      // Show error in chat
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error.message || 'Failed to send message'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header Navbar matching Dashboard style */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/Neomemory-logo.png" alt="Neo Memory Logo" className="w-12 h-12" />
              <h1 className="text-2xl font-bold text-gradient-blue">
                Neo Memory Chat
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                onClick={() => navigate('/chat-memory')}
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <Database className="w-4 h-4 mr-2" />
                View All Memories
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
      {/* Sidebar - Conversations */}
      {showSidebar && (
        <div className="w-64 border-r border-slate-800 bg-slate-900/50">
          <div className="p-4">
            <button
              onClick={createNewConversation}
              className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              New Conversation
            </button>
          </div>

          <div className="overflow-y-auto px-2">
            {/* Upload box */}
            {showFileUpload && (
              <div className="px-3 pb-3 border-b border-slate-800">
                <div className="mb-2 text-xs font-semibold text-slate-400">Attach File Context</div>
                <input
                  type="file"
                  className="mb-2 w-full text-xs text-slate-300"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                />
                <button
                  disabled={!uploadFile}
                  onClick={async () => {
                    if (!uploadFile) return;
                    setUploadStatus('Uploading...');
                    const formData = new FormData();
                    formData.append('file', uploadFile);
                    if (activeConversation) formData.append('conversationId', activeConversation);
                    const resp = await fetch('http://localhost:8787/api/chat/file-context', {
                      method: 'POST',
                      credentials: 'include',
                      body: formData
                    });
                    const data = await resp.json();
                      if (!resp.ok) {
                        setUploadStatus('Error: ' + (data.error || 'Failed'));
                      } else {
                        setUploadStatus('Attached');
                        if (!activeConversation) {
                          setActiveConversation(data.conversationId);
                          onConversationChange?.(data.conversationId);
                        }
                        loadConversation(data.conversationId);
                      }
                    setTimeout(() => setUploadStatus(''), 3000);
                  }}
                  className="w-full text-xs px-2 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40"
                >
                  Add File Context
                </button>
                {uploadStatus && <div className="mt-1 text-[10px] text-slate-400 truncate">{uploadStatus}</div>}
              </div>
            )}

            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => loadConversation(conversation.id)}
                className={`p-3 mb-2 rounded-lg cursor-pointer transition-colors ${
                  activeConversation === conversation.id
                    ? "bg-blue-500/20 border border-blue-500"
                    : "hover:bg-slate-800 border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <MessageSquare className="w-4 h-4 flex-shrink-0 text-slate-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate text-slate-200">
                        {conversation.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {(conversation.preview || '').substring(0, 60)}
                      </p>
                      <p className="text-xs text-slate-600 mt-1">
                        {(conversation.messageCount ?? 0)} messages • {conversation.model || conversation.currentModel}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conversation.id);
                    }}
                    className="p-1 hover:bg-red-500/10 rounded transition-colors text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
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
            <MessageSquare className="w-5 h-5" />
          </button>
          <div className="text-sm text-slate-400">
            {activeConversation
              ? (conversations.find(c => c.id === activeConversation)?.title || 'Conversation')
              : messages.length > 0
                ? 'New Conversation'
                : 'No active conversation'}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Dashboard API Key & Model Selector Sidebar */}
          <div className="w-80 border-r border-slate-800 bg-slate-900/50 p-4 overflow-y-auto space-y-6">
            {/* Dashboard API Key Selector */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-semibold text-slate-200">Dashboard Context</h3>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-slate-400">Select Dashboard API Key</label>
                <select
                  value={selectedDashboardApiKey}
                  onChange={(e) => {
                    setSelectedDashboardApiKey(e.target.value)
                    setDashboardMemories([]) // Clear memories when switching keys
                    setMemoryFetchStatus(null)
                    setShowLoadedMemories(false) // Hide loaded memories view when switching keys
                  }}
                  className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select API Key --</option>
                  {dashboardApiKeys
                    .filter(key => key.is_active)
                    .map((key) => (
                      <option key={key.id} value={key.key} className="bg-slate-800">
                        {key.name} ({key.usage_count} uses)
                      </option>
                    ))}
                </select>
              </div>

              <Button
                onClick={fetchDashboardMemories}
                disabled={!selectedDashboardApiKey || isFetchingMemories}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                {isFetchingMemories ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4 mr-2" />
                    Fetch Memories
                  </>
                )}
              </Button>

              {memoryFetchStatus && (
                <div className={`p-2 rounded-lg text-xs flex items-center gap-2 ${
                  memoryFetchStatus.success 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {memoryFetchStatus.success ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Loader className="w-4 h-4" />
                  )}
                  {memoryFetchStatus.message}
                </div>
              )}

              {dashboardMemories.length > 0 && (
                <div className="space-y-2">
                  <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                    <p className="text-xs text-blue-300 font-medium">
                      {dashboardMemories.length} memories loaded
                    </p>
                    <p className="text-xs text-blue-400 mt-1">
                      These will be used as context for all LLM responses
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowLoadedMemories(!showLoadedMemories)}
                    variant="outline"
                    size="sm"
                    className="w-full bg-black border-slate-700 text-blue-300 hover:bg-slate-800"
                  >
                    {showLoadedMemories ? (
                      <>
                        <ChevronUp className="w-4 h-4 mr-2" />
                        Hide Loaded Memories
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        View Loaded Memories
                      </>
                    )}
                  </Button>
                  {showLoadedMemories && (
                    <div className="max-h-96 overflow-y-auto space-y-2 border border-slate-700 rounded-lg p-3 bg-slate-800/50">
                      {dashboardMemories.map((memory, index) => (
                        <div
                          key={memory.id || index}
                          className="p-3 rounded-lg bg-slate-900/50 border border-slate-700 text-sm"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <span className="text-xs text-blue-400 font-medium">
                              Memory {index + 1}
                            </span>
                            {memory.created_at && (
                              <span className="text-xs text-slate-500">
                                {new Date(memory.created_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-200 whitespace-pre-wrap break-words">
                            {typeof memory === 'string' ? memory : memory.content || JSON.stringify(memory)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Model Selector */}
            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Key className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-semibold text-slate-200">AI Model</h3>
              </div>
              <ModelSelector onModelSelect={handleModelSelect} selectedModel={selectedModel} />
            </div>
          </div>

          {/* Chat Interface */}
          <div className="flex-1 flex flex-col bg-slate-950">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <p className="mb-2 text-lg">Start a conversation</p>
                    <p className="text-sm text-slate-500">Select a model and send a message to begin</p>
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
            <form onSubmit={sendMessage} className="border-t border-slate-800 p-4 bg-slate-900/50">
              {!selectedApiKey && (
                <p className="text-xs text-red-400 mb-2">Please select a model and add its API key to chat</p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  disabled={isLoading || !selectedApiKey}
                  className="flex-1 px-4 py-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || !selectedApiKey}
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

