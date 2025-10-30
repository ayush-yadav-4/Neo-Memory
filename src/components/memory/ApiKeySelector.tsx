import { useState, useEffect } from 'react';
import { Key, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

interface ApiKeyListItem {
  id: string;
  key: string;
  name: string;
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  usage_count: number;
  rate_limit: number;
  scopes: string[];
  created_at: string;
}

interface ApiKeySelectorProps {
  selectedApiKey: string;
  onApiKeyChange: (apiKey: string) => void;
}

const ApiKeySelector = ({ selectedApiKey, onApiKeyChange }: ApiKeySelectorProps) => {
  const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadKeys = async () => {
    setLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const resp = await fetch(`${apiBase}/manage-api-keys?action=list`, { 
        credentials: 'include' 
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to load keys');
      setKeys(data.keys || []);
    } catch (e: any) {
      toast({ 
        title: 'Error', 
        description: e.message || 'Failed to load API keys', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleKeyChange = (keyId: string) => {
    const selectedKey = keys.find(k => k.id === keyId);
    if (selectedKey) {
      onApiKeyChange(selectedKey.key);
    }
  };

  return (
    <Card className="shadow-elegant border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Key className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Select API Key</CardTitle>
            <CardDescription>
              Choose which API key to use for memory operations
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Select 
              value={keys.find(k => k.key === selectedApiKey)?.id || ''} 
              onValueChange={handleKeyChange}
              disabled={loading}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an API key..." />
              </SelectTrigger>
              <SelectContent>
                {keys.map((key) => (
                  <SelectItem key={key.id} value={key.id} disabled={!key.is_active}>
                    <div className="flex items-center justify-between w-full">
                      <span>{key.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {key.is_active ? 'Active' : 'Inactive'} • {key.usage_count} uses
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={loadKeys}
              disabled={loading}
            >
              Refresh
            </Button>
          </div>
          
          {selectedApiKey && (
            <div className="p-3 rounded-lg bg-accent/30 border border-primary/20">
              <p className="text-sm font-medium text-foreground">Selected Key:</p>
              <p className="text-xs font-mono text-muted-foreground mt-1">
                {selectedApiKey}
              </p>
            </div>
          )}
          
          {keys.length === 0 && !loading && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                No API keys found. Generate one in the API Key tab first.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ApiKeySelector;
