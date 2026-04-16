"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Trash2, Brain } from "lucide-react"

interface ChatMemory {
  _id: string
  text: string
  source: string
  createdAt: string
}

export function MemorySection() {
  const [memories, setMemories] = useState<ChatMemory[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [newMemoryText, setNewMemoryText] = useState("")

  useEffect(() => {
    loadMemories()
  }, [])

  const loadMemories = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/api/chat-memory/list`, {
        credentials: 'include',
      })
      
      if (response.ok) {
        const data = await response.json()
        setMemories(data.memories || [])
      }
    } catch (error) {
      console.error("Error loading memories:", error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      loadMemories() // Show recent memories when search is cleared
      return
    }

    setIsLoading(true)
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/api/chat-memory/retrieve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          query: searchQuery,
          topK: 10,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.context || [])
      }
    } catch (error) {
      console.error("Error searching memories:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStoreMemory = async () => {
    if (!newMemoryText.trim()) return

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/api/chat-memory/store`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          text: newMemoryText,
          source: "manual",
        }),
      })

      if (response.ok) {
        setNewMemoryText("")
        // Refresh memories
        await loadMemories()
      }
    } catch (error) {
      console.error("Error storing memory:", error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="w-5 h-5" />
        <h3 className="text-lg font-semibold">Chat Memory</h3>
      </div>

      {/* Search */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search memories..."
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          <p className="text-xs text-muted-foreground">Found {searchResults.length} memories</p>
          {searchResults.map((result, idx) => (
            <div
              key={idx}
              className="p-2 border border-border rounded-lg bg-secondary text-sm"
            >
              <p className="text-xs">{result}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recent Memories */}
      {memories.length > 0 && searchResults.length === 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto border-t border-border pt-4 mt-4">
          <p className="text-xs text-muted-foreground font-medium">Recent Memories</p>
          {memories.slice(0, 10).map((memory) => (
            <div
              key={memory._id}
              className="p-2 border border-border rounded-lg bg-secondary text-sm"
            >
              <p className="text-xs">{memory.text}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(memory.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
      </div>

      {/* Add Memory */}
      <div className="space-y-2 border-t border-border pt-4">
        <label className="block text-sm font-medium">Add Memory</label>
        <textarea
          value={newMemoryText}
          onChange={(e) => setNewMemoryText(e.target.value)}
          placeholder="Enter a memory to store..."
          className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
          rows={3}
        />
        <button
          onClick={handleStoreMemory}
          disabled={!newMemoryText.trim()}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Store Memory
        </button>
      </div>

      {/* Info */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
        <p>💡 Memories are automatically saved from your conversations</p>
        <p>🔍 Search your memory to find relevant context</p>
      </div>
    </div>
  )
}

