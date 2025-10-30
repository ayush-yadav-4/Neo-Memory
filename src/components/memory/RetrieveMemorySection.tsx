import { useState } from 'react';
import { Search, Loader2, Brain } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';

interface RetrieveMemorySectionProps {
  apiKey: string;
}

interface Memory {
  id: string;
  content: string;
  similarity: string;
  metadata?: { category?: string };
  created_at: string;
}

const RetrieveMemorySection = ({ apiKey }: RetrieveMemorySectionProps) => {
  const [query, setQuery] = useState('');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please generate an API key first',
        variant: 'destructive',
      });
      return;
    }

    if (!query.trim()) {
      toast({
        title: 'Query Required',
        description: 'Please enter a search query',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(
        `${apiBase}/retrieve-memories`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
          },
          credentials: 'include',
          body: JSON.stringify({
            query: query.trim(),
            limit: 5,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to retrieve memories');
      }

      setMemories(data.memories || []);

      if (data.memories?.length === 0) {
        toast({
          title: 'No Results',
          description: 'No similar memories found for your query',
        });
      } else {
        toast({
          title: 'Memories Retrieved',
          description: `Found ${data.memories.length} relevant memories`,
        });
      }
    } catch (error) {
      console.error('Error retrieving memories:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to retrieve memories',
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
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Search className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <CardTitle className="text-white">Search Memories</CardTitle>
            <CardDescription className="text-slate-400">
              Find relevant memories using semantic vector similarity search
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="query" className="text-slate-300">Search Query</Label>
          <div className="flex gap-2">
            <Input
              id="query"
              placeholder="What programming language should I use?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
            />
            <Button 
              onClick={handleSearch} 
              disabled={isLoading || !apiKey || !query.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Enter a natural language query to find relevant memories
          </p>
        </div>

        {memories.length > 0 && (
          <div className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-white">
              <Brain className="w-4 h-4 text-purple-400" />
              Search Results ({memories.length})
            </h3>
            <div className="space-y-3">
              {memories.map((memory) => (
                <div
                  key={memory.id}
                  className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <Badge variant="secondary" className="font-mono text-xs bg-green-500/20 text-green-400 border-green-500/30">
                      {(parseFloat(memory.similarity) * 100).toFixed(1)}% match
                    </Badge>
                    {memory.metadata?.category && (
                      <Badge variant="outline" className="border-slate-600 text-slate-300">{memory.metadata.category}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-200 leading-relaxed">{memory.content}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {new Date(memory.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!apiKey && (
          <p className="text-sm text-orange-400 text-center">
            Please generate an API key first in the API Key tab
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default RetrieveMemorySection;
