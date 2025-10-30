import { useState, useEffect } from 'react';
import { Brain, Loader2, Trash2, Filter, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

interface MemoryListSectionProps {
  apiKey: string;
  refreshTrigger?: number;
}

interface Memory {
  id: string;
  content: string;
  metadata?: { category?: string };
  created_at: string;
}

interface ApiKey {
  id: string;
  key: string;
  name: string;
  is_active: boolean;
  usage_count: number;
  created_at: string;
}

const MemoryListSection = ({ apiKey, refreshTrigger }: MemoryListSectionProps) => {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [allMemories, setAllMemories] = useState<Memory[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [selectedApiKey, setSelectedApiKey] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { notifyMemoryDeleted } = useNotifications();

  const loadApiKeys = async () => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/manage-api-keys?action=list`, { 
        credentials: 'include' 
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load keys');
      setApiKeys(data.keys || []);
    } catch (e: any) {
      console.error('Error loading API keys:', e);
    }
  };

  const loadMemories = async () => {
    if (!apiKey) return;

    setIsLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(
        `${apiBase}/list-memories?limit=50`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': apiKey,
          },
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to list memories');
      }

      const memoriesData = data.memories || [];
      setAllMemories(memoriesData);
      setMemories(memoriesData);
    } catch (error) {
      console.error('Error listing memories:', error);
      toast({
        title: 'Error',
        description: 'Failed to load memories',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterMemories = async () => {
    let filtered: Memory[] = [];

    // If no API key selected, show empty state
    if (!selectedApiKey) {
      setMemories([]);
      return;
    }

    // Filter by API key - fetch memories for specific API key
    try {
      const selectedKey = apiKeys.find(key => key.id === selectedApiKey);
      if (selectedKey) {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
        const response = await fetch(
          `${apiBase}/list-memories?limit=50`,
          {
            method: 'GET',
            headers: {
              'X-API-Key': selectedKey.key,
            },
            credentials: 'include',
          }
        );

        if (response.ok) {
          const data = await response.json();
          filtered = data.memories || [];
        } else {
          console.error('Failed to fetch memories for selected API key');
          toast({
            title: 'Error',
            description: 'Failed to load memories for selected API key',
            variant: 'destructive',
          });
          return;
        }
      } else {
        console.error('Selected API key not found');
        return;
      }
    } catch (error) {
      console.error('Error filtering by API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to filter memories by API key',
        variant: 'destructive',
      });
      return;
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(memory =>
        memory.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        memory.metadata?.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setMemories(filtered);
  };

  const handleDelete = async (memoryId: string) => {
    if (!apiKey) return;

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(
        `${apiBase}/delete-memory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          credentials: 'include',
          body: JSON.stringify({ memoryId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete memory');
      }

      setMemories(memories.filter((m) => m.id !== memoryId));
      setAllMemories(allMemories.filter((m) => m.id !== memoryId));
      
      toast({
        title: 'Memory Deleted',
        description: 'Memory has been successfully removed',
      });

      // Show notification with sound
      notifyMemoryDeleted();
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete memory',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (apiKey) {
      loadApiKeys();
    }
  }, [apiKey]);

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0) {
      loadMemories();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    filterMemories();
  }, [selectedApiKey, searchQuery, apiKeys]);

  return (
    <Card className="shadow-elegant border-slate-800 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <Brain className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-white">All Memories</CardTitle>
              <CardDescription className="text-slate-400">
                View and manage all stored memories ({memories.length})
              </CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadMemories}
            disabled={isLoading || !apiKey}
            className="border-slate-700 text-slate-300 hover:bg-slate-800"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Refresh'
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Filter by API Key</Label>
            <Select value={selectedApiKey} onValueChange={setSelectedApiKey}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                <SelectValue placeholder="Select an API key to view its memories" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {apiKeys.map((key) => (
                  <SelectItem key={key.id} value={key.id} className="text-white">
                    {key.name} ({key.usage_count} uses)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-slate-300">Search Memories</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                placeholder="Search content or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-400" />
          </div>
        ) : memories.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">
              {!selectedApiKey 
                ? 'Select an API key to view its memories' 
                : searchQuery 
                  ? 'No memories found matching your search' 
                  : 'No memories found for this API key'
              }
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {!selectedApiKey 
                ? 'Choose an API key from the dropdown above' 
                : searchQuery 
                  ? 'Try adjusting your search terms' 
                  : 'This API key has no stored memories yet'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {memories.map((memory) => (
              <div
                key={memory.id}
                className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-green-500/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex gap-2">
                    {memory.metadata?.category && (
                      <Badge variant="outline" className="border-slate-600 text-slate-300">
                        {memory.metadata.category}
                      </Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(memory.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{memory.content}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(memory.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {!apiKey && (
          <p className="text-sm text-orange-400 text-center py-8">
            Please generate an API key first in the API Key tab
          </p>
        )}

        {apiKey && apiKeys.length === 0 && (
          <p className="text-sm text-orange-400 text-center py-8">
            No API keys found. Generate an API key first to view memories.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MemoryListSection;
