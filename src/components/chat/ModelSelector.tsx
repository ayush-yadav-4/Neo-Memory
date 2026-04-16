"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Eye, EyeOff } from "lucide-react"

export type ModelProvider = "gemini-1.5" | "gemini-pro" | "gpt-4o" | "gpt-4o-mini" | "claude" | "perplexity"

export interface SavedModel {
  id: string
  provider: ModelProvider
  apiKey: string
  name: string
  isActive: boolean
}

interface ModelSelectorProps {
  onModelSelect: (provider: ModelProvider, apiKey: string) => void
  selectedModel?: ModelProvider
}

const MODEL_INFO: Record<ModelProvider, { name: string; description: string; apiKeyUrl: string }> = {
  "gemini-1.5": {
    name: "Google Gemini 1.5",
    description: "Latest Gemini model with enhanced capabilities",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
  },
  "gemini-pro": {
    name: "Google Gemini Pro",
    description: "Fast and efficient Gemini model",
    apiKeyUrl: "https://aistudio.google.com/app/apikey",
  },
  "gpt-4o": {
    name: "OpenAI GPT-4o",
    description: "Advanced reasoning and multimodal capabilities",
    apiKeyUrl: "https://platform.openai.com/api-keys",
  },
  "gpt-4o-mini": {
    name: "OpenAI GPT-4o Mini",
    description: "Faster and more cost-effective GPT-4o",
    apiKeyUrl: "https://platform.openai.com/api-keys",
  },
  claude: {
    name: "Anthropic Claude",
    description: "Thoughtful and nuanced responses",
    apiKeyUrl: "https://console.anthropic.com/",
  },
  perplexity: {
    name: "Perplexity AI",
    description: "Real-time web search and reasoning",
    apiKeyUrl: "https://www.perplexity.ai/",
  },
}

export function ModelSelector({ onModelSelect, selectedModel }: ModelSelectorProps) {
  const [models, setModels] = useState<SavedModel[]>([])
  const [showForm, setShowForm] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<ModelProvider>("gemini-1.5")
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = () => {
    const saved = localStorage.getItem("saved_models")
    if (saved) {
      setModels(JSON.parse(saved))
    }
  }

  const saveModel = () => {
    if (!apiKey.trim()) {
      setError("API key is required")
      return
    }

    const newModel: SavedModel = {
      id: Date.now().toString(),
      provider: selectedProvider,
      apiKey,
      name: MODEL_INFO[selectedProvider].name,
      isActive: true,
    }

    const updated = [...models, newModel]
    setModels(updated)
    localStorage.setItem("saved_models", JSON.stringify(updated))

    // Auto-select the newly added model
    onModelSelect(selectedProvider, apiKey)

    setApiKey("")
    setShowForm(false)
    setError("")
  }

  const deleteModel = (id: string) => {
    const updated = models.filter((m) => m.id !== id)
    setModels(updated)
    localStorage.setItem("saved_models", JSON.stringify(updated))
  }

  const selectModel = (model: SavedModel) => {
    onModelSelect(model.provider, model.apiKey)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-200">AI Models</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Model
        </button>
      </div>

      {/* Add Model Form */}
      {showForm && (
        <div className="border border-slate-700 rounded-lg p-4 space-y-4 bg-slate-800/50">
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">Select Model</label>
            <select
              value={selectedProvider}
              onChange={(e) => {
                setSelectedProvider(e.target.value as ModelProvider)
                setError("")
              }}
              className="w-full px-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {Object.entries(MODEL_INFO).map(([key, info]) => (
                <option key={key} value={key} className="bg-slate-800">
                  {info.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 mt-1">{MODEL_INFO[selectedProvider].description}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-slate-300">API Key</label>
            <div className="flex gap-2">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value)
                  setError("")
                }}
                placeholder="Enter your API key"
                className="flex-1 px-3 py-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-3 py-2 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-slate-300"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
            <a
              href={MODEL_INFO[selectedProvider].apiKeyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:underline mt-1 inline-block"
            >
              Get API key
            </a>
          </div>

          <div className="flex gap-2">
            <button
              onClick={saveModel}
              disabled={!apiKey.trim()}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Save Model
            </button>
            <button
              onClick={() => {
                setShowForm(false)
                setError("")
              }}
              className="flex-1 px-3 py-2 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-slate-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Saved Models */}
      <div className="space-y-2">
        {models.length === 0 ? (
          <p className="text-sm text-slate-400">No models added yet. Add one to get started.</p>
        ) : (
          models.map((model) => (
            <div
              key={model.id}
              onClick={() => selectModel(model)}
              className={`p-3 border rounded-lg cursor-pointer transition-all ${
                selectedModel === model.provider
                  ? "border-blue-500 bg-blue-500/20"
                  : "border-slate-700 hover:border-blue-500/50 bg-slate-800/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-slate-200">{model.name}</p>
                  <p className="text-xs text-slate-400">
                    {model.apiKey.slice(0, 4)}...{model.apiKey.slice(-4)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteModel(model.id)
                  }}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

