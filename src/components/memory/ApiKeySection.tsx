import { useState } from 'react';
import { Key, Copy, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useNotifications } from '@/hooks/useNotifications';
// Using custom API server instead of Supabase functions

interface ApiKeySectionProps { onApiKeyGenerated: (apiKey: string) => void; }

const ApiKeySection = ({ onApiKeyGenerated }: ApiKeySectionProps) => {
  const [generatedKey, setGeneratedKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [keyName, setKeyName] = useState('');
  const { toast } = useToast();
  const { notifyApiKeyGenerated } = useNotifications();

  const handleGenerateKey = async () => {
    if (!keyName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the API key',
        variant: 'destructive',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const response = await fetch(`${apiBase}/generate-api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: keyName })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to generate API key');

      setGeneratedKey(data.apiKey);
      onApiKeyGenerated(data.apiKey);
      
      toast({
        title: 'API Key Generated',
        description: 'Store this key securely - it will not be shown again',
      });

      // Show notification with sound
      notifyApiKeyGenerated(keyName);
    } catch (error) {
      console.error('Error generating API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate API key',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    console.log('Copying full generated API key:', generatedKey); // Debug log
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied!',
      description: `Full API key copied to clipboard (${generatedKey.length} characters)`,
    });
  };

  return (
    <Card className="shadow-elegant border-slate-800 bg-slate-900/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/20">
            <Key className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-white">Generate API Key</CardTitle>
            <CardDescription className="text-slate-400">
              Create a new API key to start storing and retrieving memories
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="keyName" className="text-slate-300">API Key Name</Label>
          <Input
            id="keyName"
            value={keyName}
            onChange={(e) => setKeyName(e.target.value)}
            placeholder="e.g., My Project API Key"
            className="w-full bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500">
            Give your API key a descriptive name to identify its purpose
          </p>
        </div>

        <Button 
          onClick={handleGenerateKey} 
          disabled={isLoading || !keyName.trim()}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Key className="w-4 h-4 mr-2" />
              Generate API Key
            </>
          )}
        </Button>

        {generatedKey && (
          <div className="mt-6 p-4 rounded-lg bg-orange-500/10 border border-orange-500/30 space-y-3">
            <Label className="text-orange-400 font-semibold">⚠️ Save this key securely!</Label>
            <div className="flex items-center gap-2">
              <Input
                value={generatedKey}
                readOnly
                className="font-mono text-sm bg-slate-800 border-slate-700 text-white"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={handleCopy}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              This API key will only be shown once. Make sure to save it in a secure location.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ApiKeySection;
