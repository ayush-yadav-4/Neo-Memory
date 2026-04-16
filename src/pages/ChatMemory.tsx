import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Trash2, Calendar, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface ChatMemory {
  _id: string;
  text: string;
  source: string;
  createdAt: string;
}

export default function ChatMemory() {
  const navigate = useNavigate();
  const [memories, setMemories] = useState<ChatMemory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    checkAuth();
    loadMemories();
  }, []);

  const checkAuth = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/auth/me`, { credentials: 'include' });
      const data = await response.json();
      if (!data.authenticated) {
        navigate('/login');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      navigate('/login');
    }
  };

  const loadMemories = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/api/chat-memory/list?limit=200`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setMemories(data.memories || []);
      }
    } catch (error) {
      console.error('Error loading memories:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setIsLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/api/chat-memory/retrieve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          query: searchQuery,
          topK: 50,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.context || []);
      }
    } catch (error) {
      console.error('Error searching memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMemory = async (memoryId: string) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/api/chat-memory/${memoryId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        await loadMemories();
        // Also refresh search results if searching
        if (isSearching) {
          await handleSearch();
        }
      }
    } catch (error) {
      console.error('Error deleting memory:', error);
    }
  };

  const displayedMemories = isSearching ? searchResults.map((text, idx) => ({
    _id: `search_${idx}`,
    text,
    source: 'search',
    createdAt: new Date().toISOString(),
  })) : memories;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Navbar */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/Neomemory-logo.png" alt="Neo Memory Logo" className="w-12 h-12" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Chat Memory
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/chat')}
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Back to Chat
              </Button>
              <Button
                variant="ghost"
                onClick={() => navigate('/dashboard')}
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <img src="/Neomemory-logo.png" alt="Neo Memory Logo" className="w-12 h-12" />
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Chat Memories
              </h1>
              <p className="text-slate-400">View and search all your chat conversation memories</p>
            </div>
          </div>
        </div>

        {/* Search Section */}
        <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search memories using semantic search..."
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Search className="w-4 h-4 mr-2" />
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
            {isSearching && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  setIsSearching(false);
                }}
                className="border-slate-700 text-slate-300"
              >
                Clear
              </Button>
            )}
          </div>
          {isSearching && searchResults.length > 0 && (
            <p className="text-sm text-slate-400 mt-2">
              Found {searchResults.length} matching memories
            </p>
          )}
        </Card>

        {/* Memories List */}
        <div className="space-y-4">
          {displayedMemories.length === 0 ? (
            <Card className="p-12 bg-slate-900/50 border-slate-800 shadow-elegant text-center">
              <Brain className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">No Memories Found</h3>
              <p className="text-slate-500">
                {isSearching
                  ? 'No memories match your search query'
                  : 'Start chatting to create memories from your conversations'}
              </p>
            </Card>
          ) : (
            displayedMemories.map((memory) => (
              <Card
                key={memory._id}
                className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant hover:shadow-xl transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-slate-500 uppercase">{memory.source}</span>
                      {memory.createdAt && (
                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {new Date(memory.createdAt).toLocaleDateString()}{' '}
                          {new Date(memory.createdAt).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                    <p className="text-slate-200 whitespace-pre-wrap">{memory.text}</p>
                  </div>
                  {!isSearching && memory._id && !memory._id.startsWith('search_') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteMemory(memory._id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Stats */}
        {!isSearching && memories.length > 0 && (
          <div className="mt-8 p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
            <p className="text-sm text-slate-400">
              Total memories: <span className="text-blue-400 font-semibold">{memories.length}</span>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

