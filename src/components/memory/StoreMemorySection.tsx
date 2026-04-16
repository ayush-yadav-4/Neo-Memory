import { useState, useEffect } from 'react';
import { Database, Loader2, Sparkles, Key } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

interface ApiKeyListItem {
  id: string;
  key: string;
  name: string;
  is_active: boolean;
  usage_count: number;
  rate_limit: number;
  expires_at: string | null;
  created_at: string;
}

interface StoreMemorySectionProps {
  apiKey: string;
  apiKeys?: ApiKeyListItem[];
  onMemoryStored?: () => void;
}

const STORAGE_KEY = 'store_memory_cache';

interface CachedData {
  apiKey: string;
  content: string;
  category: string;
}

const StoreMemorySection = ({ apiKey: defaultApiKey, apiKeys = [], onMemoryStored }: StoreMemorySectionProps) => {
  // Load cached data from localStorage on mount
  const loadCachedData = (): CachedData => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.warn('Failed to load cached store memory data:', error);
    }
    return { apiKey: '', content: '', category: '' };
  };

  const cachedData = loadCachedData();
  // Initialize state from cache only, ignore defaultApiKey prop
  const [content, setContent] = useState(cachedData.content || '');
  const [category, setCategory] = useState(cachedData.category || '');
  const [apiKeyInput, setApiKeyInput] = useState<string>(cachedData.apiKey || '');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { notifyMemoryAdded } = useNotifications();

  // Save data to localStorage whenever it changes
  const saveToCache = (apiKey: string, content: string, category: string) => {
    try {
      const dataToCache: CachedData = {
        apiKey: apiKey.trim(),
        content: content.trim(),
        category: category.trim(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToCache));
    } catch (error) {
      console.warn('Failed to cache store memory data:', error);
    }
  };

  // Save to cache when any field changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveToCache(apiKeyInput, content, category);
    }, 500); // Debounce for 500ms

    return () => clearTimeout(timeoutId);
  }, [apiKeyInput, content, category]);

  const handleStore = async () => {
    const apiKeyToUse = apiKeyInput.trim();

    if (!apiKeyToUse) {
      toast({
        title: 'API Key Required',
        description: 'Please enter or paste your API key',
        variant: 'destructive',
      });
      return;
    }
    
    // Basic validation - API keys should start with sk_mem_
    if (!apiKeyToUse.startsWith('sk_mem_')) {
      toast({
        title: 'Invalid API Key Format',
        description: 'API key should start with "sk_mem_"',
        variant: 'destructive',
      });
      return;
    }

    if (!content.trim()) {
      toast({
        title: 'Content Required',
        description: 'Please enter memory content to store',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      
      console.log('[Store Memory] Sending request with API key:', apiKeyToUse.substring(0, 15) + '...');
      
      const response = await fetch(
        `${apiBase}/store-memory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKeyToUse.trim(), // Ensure trimmed
          },
          credentials: 'include',
          body: JSON.stringify({
            content: content.trim(),
            metadata: category ? { category: category.trim() } : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('[Store Memory] Error response:', {
          status: response.status,
          error: data.error
        });
        throw new Error(data.error || 'Failed to store memory');
      }

      toast({
        title: 'Memory Stored',
        description: 'Your memory has been successfully stored with vector embeddings',
      });

      // Show notification with sound
      notifyMemoryAdded(content.trim());

      // Clear form data and cache after successful storage
      setContent('');
      setCategory('');
      setApiKeyInput('');
      
      // Clear cache after successful storage
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear cache:', error);
      }
      
      // Trigger memory list refresh
      if (onMemoryStored) {
        onMemoryStored();
      }
    } catch (error) {
      console.error('Error storing memory:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to store memory',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-elegant border-slate-800 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/20">
            <Database className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <CardTitle className="text-white">Store Memory</CardTitle>
            <CardDescription className="text-slate-400">
              Save contextual information with vector embeddings for semantic search
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="apiKeyInput" className="text-slate-300 flex items-center gap-2">
            <Key className="w-4 h-4" />
            API Key *
          </Label>
          <Input
            id="apiKeyInput"
            type="text"
            placeholder="sk_mem_..."
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            disabled={isLoading}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-mono text-sm"
          />
          <p className="text-xs text-slate-500">
            Paste your API key here. The MCP server connected with this key will be able to retrieve this memory. You can copy your API key from the "API Keys" tab above.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content" className="text-slate-300">Memory Content *</Label>
          <Textarea
            id="content"
            placeholder="User prefers Python for backend development and uses PostgreSQL for databases..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={isLoading}
            rows={6}
            className="resize-none bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500">
            Enter any contextual information, preferences, or facts you want to remember
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category" className="text-slate-300">Category (optional)</Label>
          <Input
            id="category"
            placeholder="preference, context, fact, conversation..."
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isLoading}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500">
            Optionally tag this memory with a category for organization
          </p>
        </div>

        <Button 
          onClick={handleStore} 
          disabled={isLoading || !apiKeyInput.trim() || !content.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Storing Memory...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Store Memory
            </>
          )}
        </Button>

        {!apiKeyInput && (
          <p className="text-sm text-orange-400 text-center">
            Please enter your API key above to store memories
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StoreMemorySection;
