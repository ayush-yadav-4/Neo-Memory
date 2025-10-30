import { useState } from 'react';
import { Database, Loader2, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useNotifications } from '@/hooks/useNotifications';

interface StoreMemorySectionProps {
  apiKey: string;
  onMemoryStored?: () => void;
}

const StoreMemorySection = ({ apiKey, onMemoryStored }: StoreMemorySectionProps) => {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { notifyMemoryAdded } = useNotifications();

  const handleStore = async () => {
    if (!apiKey) {
      toast({
        title: 'API Key Required',
        description: 'Please generate an API key first',
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
      const response = await fetch(
        `${apiBase}/store-memory`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey,
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
        throw new Error(data.error || 'Failed to store memory');
      }

      toast({
        title: 'Memory Stored',
        description: 'Your memory has been successfully stored with vector embeddings',
      });

      // Show notification with sound
      notifyMemoryAdded(content.trim());

      setContent('');
      setCategory('');
      
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
          disabled={isLoading || !apiKey || !content.trim()}
          className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white"
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

        {!apiKey && (
          <p className="text-sm text-orange-400 text-center">
            Please generate an API key first in the API Key tab
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StoreMemorySection;
