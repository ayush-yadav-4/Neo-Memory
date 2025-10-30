import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Copy } from 'lucide-react';

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

const MyApiKeysSection = () => {
  const [keys, setKeys] = useState<ApiKeyListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
      const resp = await fetch(`${apiBase}/manage-api-keys?action=list`, { credentials: 'include' });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to load keys');
      setKeys(data.keys || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to load API keys', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">My API Keys</h3>
        <Button size="sm" variant="outline" onClick={load} disabled={loading}>Refresh</Button>
      </div>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((k) => (
              <TableRow key={k.id}>
                <TableCell>{k.name}</TableCell>
                <TableCell className="font-mono text-xs flex items-center gap-2">
                  {k.key}
                  <Button size="icon" variant="outline" onClick={() => {navigator.clipboard.writeText(k.key); toast({title: 'Copied!', description: 'API key copied successfully'});}}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </TableCell>
                <TableCell>{k.is_active ? 'Active' : 'Inactive'}</TableCell>
                <TableCell>{k.usage_count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};

export default MyApiKeysSection;


