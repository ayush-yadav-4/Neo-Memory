import React, { createContext, useContext } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Key, Database, Search, Settings, Copy, Check, LogOut, User, BookOpen, Code } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import ApiKeySection from '@/components/memory/ApiKeySection';
import StoreMemorySection from '@/components/memory/StoreMemorySection';
import RetrieveMemorySection from '@/components/memory/RetrieveMemorySection';
import MemoryListSection from '@/components/memory/MemoryListSection';

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

interface ApiKeyContextType {
  activeApiKey: string;
  setActiveApiKey: (key: string) => void;
  apiKeys: ApiKeyListItem[];
  setApiKeys: React.Dispatch<React.SetStateAction<ApiKeyListItem[]>>;
}
const ApiKeyContext = createContext<ApiKeyContextType | undefined>(undefined);

export const useApiKeyContext = () => {
  const ctx = useContext(ApiKeyContext);
  if (!ctx) throw new Error('useApiKeyContext must be inside ApiKeyProvider');
  return ctx;
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [activeApiKey, setActiveApiKey] = useState<string>(import.meta.env.VITE_DEFAULT_API_KEY || '');
  const [apiKeys, setApiKeys] = useState<ApiKeyListItem[]>([]);
  const [refreshMemories, setRefreshMemories] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const { toast } = useToast();
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

  const loadApiKeys = async () => {
    try {
      const resp = await fetch(`${apiBase}/manage-api-keys?action=list`, { 
        credentials: 'include' 
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to load keys');
      setApiKeys(data.keys || []);
    } catch (e: any) {
      toast({ 
        title: 'Error', 
        description: e.message || 'Failed to load API keys', 
        variant: 'destructive' 
      });
    }
  };

  const copyApiKey = (key: string) => {
    console.log('Copying full API key:', key); // Debug log
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: 'Copied!',
      description: `Full API key copied to clipboard (${key.length} characters)`,
    });
  };

  const handleMemoryStored = () => {
    setRefreshMemories(prev => prev + 1);
  };

  useEffect(() => {
    loadApiKeys();
  }, []);

  const handleLogout = () => {
    // Clear any stored data
    localStorage.removeItem('activeApiKey');
    // Navigate to home page
    navigate('/');
    toast({
      title: 'Logged out',
      description: 'You have been successfully logged out',
    });
  };

  return (
    <ApiKeyContext.Provider value={{ activeApiKey, setActiveApiKey, apiKeys, setApiKeys }}>
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
              
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/about')}
                  className="text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  About Us
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/docs')}
                  className="text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Docs
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => navigate('/connect')}
                  className="text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <Code className="w-4 h-4 mr-2" />
                  Connect MCP
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={handleLogout}
                  className="text-slate-300 hover:text-white hover:bg-slate-800"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  NeoMemory Dashboard
                </h1>
                <p className="text-slate-400">Manage your memories and API keys</p>
              </div>
            </div>
          </div>

          <Tabs defaultValue="api-keys" className="space-y-8">
            <TabsList className="grid w-full grid-cols-5 max-w-4xl mx-auto bg-slate-900/50 shadow-elegant border border-slate-800">
              <TabsTrigger value="api-keys" className="gap-2 text-slate-300 data-[state=active]:text-white">
                <Key className="w-4 h-4" />
                API Keys
              </TabsTrigger>
              <TabsTrigger value="store" className="gap-2 text-slate-300 data-[state=active]:text-white">
                <Database className="w-4 h-4" />
                Store
              </TabsTrigger>
              <TabsTrigger value="retrieve" className="gap-2 text-slate-300 data-[state=active]:text-white">
                <Search className="w-4 h-4" />
                Search
              </TabsTrigger>
              <TabsTrigger value="memories" className="gap-2 text-slate-300 data-[state=active]:text-white">
                <Brain className="w-4 h-4" />
                Memories
              </TabsTrigger>
              <TabsTrigger value="settings" className="gap-2 text-slate-300 data-[state=active]:text-white">
                <Settings className="w-4 h-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <div className="max-w-6xl mx-auto">
              <TabsContent value="api-keys" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Generate New API Key */}
                  <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant">
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Key className="w-5 h-5 text-blue-400" />
                      Generate New API Key
                    </h3>
                    <ApiKeySection onApiKeyGenerated={(key) => {
                      setActiveApiKey(key);
                      loadApiKeys();
                    }} />
                  </Card>

                  {/* API Keys List */}
                  <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Key className="w-5 h-5 text-green-400" />
                        Your API Keys
                      </h3>
                      <Button 
                        onClick={loadApiKeys} 
                        variant="outline" 
                        size="sm"
                        className="border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Refresh
                      </Button>
                    </div>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {apiKeys.map((key) => (
                        <div key={key.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white">{key.name}</span>
                              <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                                Active
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyApiKey(key.key)}
                              className="text-slate-400 hover:text-white"
                            >
                              {copiedKey === key.key ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                          {/* Show API key below the name in larger font */}
                          <div className="mb-2">
                            <span className="text-sm font-mono text-green-300 bg-slate-900 px-2 py-1 rounded break-all select-all">
                              {key.key}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Usage: {key.usage_count}</span>
                            <span>Limit: {key.rate_limit}/hr</span>
                            <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="store" className="space-y-6">
                <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-blue-400" />
                    Store New Memory
                  </h3>
                  <StoreMemorySection apiKey={activeApiKey} onMemoryStored={handleMemoryStored} />
                </Card>
              </TabsContent>

              <TabsContent value="retrieve" className="space-y-6">
                <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Search className="w-5 h-5 text-purple-400" />
                    Search Memories
                  </h3>
                  <RetrieveMemorySection apiKey={activeApiKey} />
                </Card>
              </TabsContent>

              <TabsContent value="memories" className="space-y-6">
                <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-green-400" />
                    All Memories
                  </h3>
                  <MemoryListSection apiKey={activeApiKey} refreshTrigger={refreshMemories} />
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-orange-400" />
                    Settings
                  </h3>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                      <h4 className="font-medium text-white mb-2">Current API Key</h4>
                      <div className="flex items-center gap-2">
                        <code className="text-sm text-slate-300 font-mono bg-slate-900 px-2 py-1 rounded break-all">
                          {activeApiKey}
                        </code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyApiKey(activeApiKey)}
                          className="text-slate-400 hover:text-white"
                        >
                          {copiedKey === activeApiKey ? (
                            <Check className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </div>
          </Tabs>
        </main>
      </div>
    </ApiKeyContext.Provider>
  );
};

export default Dashboard;
