import { Brain, BookOpen, Code, Key, Database, Search, Trash2, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const Documentation = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                NeoMemory
              </h1>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl">
                <BookOpen className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                API Documentation
              </h1>
            </div>
            <p className="text-xl text-slate-300 leading-relaxed">
              Complete guide to NeoMemory's REST API and MCP server endpoints
            </p>
          </div>

          {/* Base URL */}
          <Card className="p-6 mb-8 bg-slate-900/50 border-slate-800 shadow-elegant">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Code className="w-6 h-6 text-blue-400" />
              Base URL
            </h2>
            <div className="bg-slate-800 p-4 rounded-lg">
              <code className="text-green-400 font-mono text-lg">http://localhost:8787</code>
            </div>
          </Card>

          {/* Authentication */}
          <Card className="p-6 mb-8 bg-slate-900/50 border-slate-800 shadow-elegant">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Key className="w-6 h-6 text-yellow-400" />
              Authentication
            </h2>
            <p className="text-slate-300 mb-4">
              All API endpoints require authentication using an API key. Include your API key in the request header:
            </p>
            <div className="bg-slate-800 p-4 rounded-lg">
              <code className="text-cyan-400 font-mono">X-API-Key: your-api-key-here</code>
            </div>
          </Card>

          {/* API Endpoints */}
          <div className="space-y-8">
            {/* Store Memory */}
            <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">POST</Badge>
                <h3 className="text-xl font-bold text-white">Store Memory</h3>
                <code className="text-slate-400 font-mono">/store-memory</code>
              </div>
              <p className="text-slate-300 mb-4">Store a new memory with AI embeddings for semantic search.</p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Request Body</h4>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <pre className="text-slate-300 text-sm overflow-x-auto">
{`{
  "content": "User prefers Python for backend development",
  "metadata": {
    "category": "preference"
  }
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Response</h4>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <pre className="text-slate-300 text-sm overflow-x-auto">
{`{
  "success": true,
  "memory": {
    "id": "uuid",
    "content": "User prefers Python for backend development",
    "metadata": {"category": "preference"},
    "created_at": "2024-01-01T00:00:00Z"
  }
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </Card>

            {/* Search Memories */}
            <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">POST</Badge>
                <h3 className="text-xl font-bold text-white">Search Memories</h3>
                <code className="text-slate-400 font-mono">/retrieve-memories</code>
              </div>
              <p className="text-slate-300 mb-4">Search for memories using semantic similarity.</p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Request Body</h4>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <pre className="text-slate-300 text-sm overflow-x-auto">
{`{
  "query": "What programming language should I use?",
  "limit": 5
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Response</h4>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <pre className="text-slate-300 text-sm overflow-x-auto">
{`{
  "success": true,
  "query": "What programming language should I use?",
  "count": 2,
  "memories": [
    {
      "id": "uuid",
      "content": "User prefers Python for backend development",
      "similarity": "0.95",
      "metadata": {"category": "preference"},
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </Card>

            {/* List Memories */}
            <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">GET</Badge>
                <h3 className="text-xl font-bold text-white">List Memories</h3>
                <code className="text-slate-400 font-mono">/list-memories</code>
              </div>
              <p className="text-slate-300 mb-4">Retrieve all memories with optional pagination.</p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Query Parameters</h4>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <code className="text-cyan-400 font-mono">?limit=50</code>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Response</h4>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <pre className="text-slate-300 text-sm overflow-x-auto">
{`{
  "success": true,
  "count": 10,
  "memories": [
    {
      "id": "uuid",
      "content": "Memory content here",
      "metadata": {"category": "preference"},
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </Card>

            {/* Delete Memory */}
            <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">POST</Badge>
                <h3 className="text-xl font-bold text-white">Delete Memory</h3>
                <code className="text-slate-400 font-mono">/delete-memory</code>
              </div>
              <p className="text-slate-300 mb-4">Delete a specific memory by ID.</p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Request Body</h4>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <pre className="text-slate-300 text-sm overflow-x-auto">
{`{
  "memoryId": "uuid-of-memory-to-delete"
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Response</h4>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <pre className="text-slate-300 text-sm overflow-x-auto">
{`{
  "success": true,
  "message": "Memory deleted successfully"
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </Card>

            {/* Generate API Key */}
            <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">POST</Badge>
                <h3 className="text-xl font-bold text-white">Generate API Key</h3>
                <code className="text-slate-400 font-mono">/generate-api-key</code>
              </div>
              <p className="text-slate-300 mb-4">Create a new API key for authentication.</p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Request Body</h4>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <pre className="text-slate-300 text-sm overflow-x-auto">
{`{
  "name": "My Project API Key"
}`}
                    </pre>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">Response</h4>
                  <div className="bg-slate-800 p-4 rounded-lg">
                    <pre className="text-slate-300 text-sm overflow-x-auto">
{`{
  "success": true,
  "apiKey": "sk_mem_...",
  "name": "My Project API Key",
  "createdAt": "2024-01-01T00:00:00Z",
  "message": "Store this API key securely - it will not be shown again"
}`}
                    </pre>
                  </div>
                </div>
              </div>
            </Card>

            {/* MCP Server */}
            <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant">
              <div className="flex items-center gap-3 mb-4">
                <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">POST</Badge>
                <h3 className="text-xl font-bold text-white">MCP Server</h3>
                <code className="text-slate-400 font-mono">/mcp-server</code>
              </div>
              <p className="text-slate-300 mb-4">Model Context Protocol endpoint for IDE integrations.</p>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-2">MCP Tools Available</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <h5 className="font-semibold text-white mb-2">store_memory</h5>
                      <p className="text-slate-400 text-sm">Store a new memory with content and metadata</p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <h5 className="font-semibold text-white mb-2">search_memory</h5>
                      <p className="text-slate-400 text-sm">Search memories using semantic similarity</p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <h5 className="font-semibold text-white mb-2">list_memories</h5>
                      <p className="text-slate-400 text-sm">List all available memories</p>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                      <h5 className="font-semibold text-white mb-2">delete_memory</h5>
                      <p className="text-slate-400 text-sm">Delete a specific memory by ID</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Error Codes */}
          <Card className="p-6 mt-8 bg-slate-900/50 border-slate-800 shadow-elegant">
            <h2 className="text-2xl font-bold text-white mb-4">Error Codes</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">401</Badge>
                <span className="text-slate-300">Unauthorized - Invalid or missing API key</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">400</Badge>
                <span className="text-slate-300">Bad Request - Invalid request body or parameters</span>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">500</Badge>
                <span className="text-slate-300">Internal Server Error - Server-side error</span>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Documentation;
