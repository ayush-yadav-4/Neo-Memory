import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
// Supabase removed; use local API server
import { RefreshCw, Trash2, Key, BarChart3, Copy } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

interface ApiKeyStats {
  totalRequests: number;
  last24hRequests: number;
  errorRate: string;
  lastUsed: string | null;
  isActive: boolean;
  rateLimit: number;
  expiresAt: string | null;
}

export const ApiKeyManagementSection = () => {
  const [userId, setUserId] = useState('');
  const [keyName, setKeyName] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('');
  const [rateLimit, setRateLimit] = useState('100');
  const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
  const [selectedKeyStats, setSelectedKeyStats] = useState<ApiKeyStats | null>(null);
  const { toast } = useToast();

  const listKeys = async () => {
    if (!userId.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a user ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const url = `${apiBase}/manage-api-keys?action=list&userId=${encodeURIComponent(userId)}`;
      
      const response = await fetch(url);

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      setKeys(data.keys || []);
      toast({
        title: 'Success',
        description: `Found ${data.count} API keys`,
      });
    } catch (error: any) {
      console.error('Error listing keys:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to list API keys',
        variant: 'destructive',
      });
    }
  };

  const rotateKey = async (keyId: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const resp = await fetch(`${apiBase}/manage-api-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, keyId, action: 'rotate' })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Rotate failed');

      toast({
        title: 'Success',
        description: 'API key rotated successfully. New key: ' + data.newKey.key,
      });

      await listKeys();
    } catch (error: any) {
      console.error('Error rotating key:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to rotate API key',
        variant: 'destructive',
      });
    }
  };

  const deleteKey = async (keyId: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const url = `${apiBase}/manage-api-keys?userId=${encodeURIComponent(userId)}&keyId=${encodeURIComponent(keyId)}`;
      
      const response = await fetch(url, { method: 'DELETE' });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      toast({
        title: 'Success',
        description: 'API key deleted successfully',
      });

      await listKeys();
    } catch (error: any) {
      console.error('Error deleting key:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete API key',
        variant: 'destructive',
      });
    }
  };

  const getKeyStats = async (keyId: string) => {
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const url = `${apiBase}/manage-api-keys?action=stats&userId=${encodeURIComponent(userId)}&keyId=${encodeURIComponent(keyId)}`;
      
      const response = await fetch(url);

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);

      setSelectedKeyStats(data.stats);
      toast({
        title: 'Statistics Loaded',
        description: `Total requests: ${data.stats.totalRequests}`,
      });
    } catch (error: any) {
      console.error('Error getting stats:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to get key statistics',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">API Key Management</h2>
        <p className="text-muted-foreground">
          Manage your API keys, view usage statistics, and rotate keys
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="userId-manage">User ID</Label>
          <Input
            id="userId-manage"
            placeholder="Enter user ID"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
          />
        </div>

        <Button onClick={listKeys} className="w-full">
          <Key className="w-4 h-4 mr-2" />
          List API Keys
        </Button>
      </div>

      {keys.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Your API Keys</h3>
          
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell className="font-mono text-sm flex items-center gap-2">
                      {key.key}
                      <Button size="icon" variant="outline" onClick={() => {navigator.clipboard.writeText(key.key); toast({title: 'Copied!', description: 'API key copied successfully'});}}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.is_active ? 'default' : 'destructive'}>
                        {key.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{key.usage_count} requests</TableCell>
                    <TableCell>{key.rate_limit}/hour</TableCell>
                    <TableCell className="space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => getKeyStats(key.id)}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rotateKey(key.id)}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteKey(key.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {selectedKeyStats && (
        <Card className="p-4 bg-muted">
          <h3 className="text-lg font-semibold mb-4">Key Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Requests</p>
              <p className="text-2xl font-bold">{selectedKeyStats.totalRequests}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last 24h Requests</p>
              <p className="text-2xl font-bold">{selectedKeyStats.last24hRequests}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Error Rate</p>
              <p className="text-2xl font-bold">{selectedKeyStats.errorRate}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Rate Limit</p>
              <p className="text-2xl font-bold">{selectedKeyStats.rateLimit}/hour</p>
            </div>
          </div>
        </Card>
      )}
    </Card>
  );
};