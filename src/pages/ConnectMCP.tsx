import { Brain, Code, Copy, Check, ExternalLink, Monitor, Terminal } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const ConnectMCP = () => {
  const [copiedConfig, setCopiedConfig] = useState<string | null>(null);
  const { toast } = useToast();

  const cursorConfig = {
    "mcpServers": {
      "memory-api": {
        "url": "http://localhost:8787/mcp-server",
        "headers": {
          "X-API-Key": "<your-api-key>"
        }
      }
    }
  };

  const traeConfig = {
    "mcpServers": {
      "memory-api": {
        "url": "http://localhost:8787/mcp-server",
        "headers": {
          "X-API-Key": "your-api-key"
        }
      }
    }
  };

  const copyToClipboard = (config: any, type: string) => {
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setCopiedConfig(type);
    setTimeout(() => setCopiedConfig(null), 2000);
    toast({
      title: 'Copied!',
      description: `${type} configuration copied to clipboard`,
    });
  };

  return (
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
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl">
                <Code className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Connect MCP Server
              </h1>
            </div>
            <p className="text-xl text-slate-300 leading-relaxed">
              Integrate NeoMemory with your favorite IDEs and AI assistants
            </p>
          </div>

          {/* Cursor IDE Integration */}
          <Card className="p-8 mb-12 bg-slate-900/50 border-slate-800 shadow-elegant">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Monitor className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">Connect with Cursor IDE</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  🧩 How to Connect the MCP Server with Cursor IDE
                </h3>
                <p className="text-slate-300 mb-6">
                  Follow these simple steps to connect your MCP server with Cursor IDE:
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Open your project folder in Cursor IDE</h4>
                      <p className="text-slate-400">Navigate to your project directory in Cursor</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">2</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Create a new folder in your project root and name it:</h4>
                      <code className="bg-slate-900 px-2 py-1 rounded text-green-400">.mcp</code>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">3</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Inside the .mcp folder, create a new file named:</h4>
                      <code className="bg-slate-900 px-2 py-1 rounded text-green-400">mcp.json</code>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">4</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Paste the following configuration into the mcp.json file:</h4>
                      <div className="mt-3 bg-slate-900 p-4 rounded-lg relative">
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2 border-slate-600 text-slate-300 hover:bg-slate-800"
                          onClick={() => copyToClipboard(cursorConfig, 'Cursor')}
                        >
                          {copiedConfig === 'Cursor' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <pre className="text-slate-300 text-sm overflow-x-auto">
{`{
  "mcpServers": {
    "memory-api": {
      "url": "http://localhost:8787/mcp-server",
      "headers": {
        "X-API-Key": "<your-api-key>"
      }
    }
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">5</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Save the file</h4>
                      <p className="text-slate-400">Press Ctrl+S (or Cmd+S on Mac) to save</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm">✓</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">After saving, Cursor IDE will automatically detect your MCP configuration and show a notification:</h4>
                      <p className="text-slate-400">"Enable MCP Server: memory-api?"</p>
                      <p className="text-slate-400 mt-2">Click "Enable" on the notification.</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h4 className="font-semibold text-green-400 mb-2">✅ Your MCP server is now successfully connected to Cursor IDE.</h4>
                  <p className="text-slate-300">You can now use it to store, retrieve, and manage memory directly from within Cursor.</p>
                </div>
              </div>
            </div>
          </Card>

          {/* TRAE IDE Integration */}
          <Card className="p-8 mb-12 bg-slate-900/50 border-slate-800 shadow-elegant">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-purple-500/20">
                <Terminal className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-3xl font-bold text-white">Connect with TRAE IDE</h2>
            </div>
            
            <div className="space-y-6">
              <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
                <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  ⚙️ How to Connect the MCP Server with TRAE IDE
                </h3>
                <p className="text-slate-300 mb-6">
                  Follow these steps to connect your MCP server with TRAE IDE:
                </p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Open the TRAE Editor</h4>
                      <p className="text-slate-400">Launch TRAE IDE on your system</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">2</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Click on the ⚙️ Settings icon</h4>
                      <p className="text-slate-400">Located at the top-right corner of the chat interface</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">3</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">From the settings menu, select "MCP"</h4>
                      <p className="text-slate-400">Navigate to the MCP configuration section</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">4</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Click on the "Add MCP" button</h4>
                      <p className="text-slate-400">Create a new MCP server configuration</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">5</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">In the MCP configuration box, paste the following code:</h4>
                      <div className="mt-3 bg-slate-900 p-4 rounded-lg relative">
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2 border-slate-600 text-slate-300 hover:bg-slate-800"
                          onClick={() => copyToClipboard(traeConfig, 'TRAE')}
                        >
                          {copiedConfig === 'TRAE' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                        <pre className="text-slate-300 text-sm overflow-x-auto">
{`{
  "mcpServers": {
    "memory-api": {
      "url": "http://localhost:8787/mcp-server",
      "headers": {
        "X-API-Key": "your-api-key"
      }
    }
  }
}`}
                        </pre>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">6</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Click Save to store the configuration</h4>
                      <p className="text-slate-400">Save your MCP server settings</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">7</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">After saving, make sure to toggle or mark the MCP server as "Active"</h4>
                      <p className="text-slate-400">Enable the MCP server in TRAE</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">8</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">Now, go back to the chat window</h4>
                      <p className="text-slate-400">Return to the main chat interface</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">9</div>
                    <div>
                      <h4 className="font-semibold text-white mb-2">In the chat options, under "Built with Agents", select "Builder with MCP"</h4>
                      <p className="text-slate-400">Enable MCP integration in the chat</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h4 className="font-semibold text-green-400 mb-2">✅ Your MCP server is now connected and active in TRAE IDE.</h4>
                  <p className="text-slate-300">You can start using your memory API directly in TRAE for storing and retrieving data across sessions.</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Additional Information */}
          <Card className="p-8 bg-slate-900/50 border-slate-800 shadow-elegant">
            <h2 className="text-2xl font-bold text-white mb-6">💡 Additional Information</h2>
            <div className="space-y-4 text-slate-300">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                <p>Make sure your NeoMemory server is running on <code className="bg-slate-800 px-2 py-1 rounded text-green-400">http://localhost:8787</code> before connecting</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                <p>Replace <code className="bg-slate-800 px-2 py-1 rounded text-yellow-400">&lt;your-api-key&gt;</code> with your actual API key from the dashboard</p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                <p>Both configurations support the same MCP tools: <code className="bg-slate-800 px-2 py-1 rounded text-cyan-400">store_memory</code>, <code className="bg-slate-800 px-2 py-1 rounded text-cyan-400">search_memory</code>, <code className="bg-slate-800 px-2 py-1 rounded text-cyan-400">list_memories</code>, and <code className="bg-slate-800 px-2 py-1 rounded text-cyan-400">delete_memory</code></p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0"></div>
                <p>If you encounter any issues, check the server logs and ensure your API key is valid and active</p>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ConnectMCP;
