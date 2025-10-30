import { Brain, Zap, Shield, Globe, Code, Database } from 'lucide-react';
import { Card } from '@/components/ui/card';

const AboutUs = () => {
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
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl">
                <Brain className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                About NeoMemory
              </h1>
            </div>
            <p className="text-xl text-slate-300 leading-relaxed">
              The next-generation memory management system powered by AI embeddings
            </p>
          </div>

          {/* What NeoMemory Does */}
          <Card className="p-8 mb-12 bg-slate-900/50 border-slate-800 shadow-elegant">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Zap className="w-8 h-8 text-yellow-400" />
              What NeoMemory Does
            </h2>
            <div className="space-y-6 text-slate-300">
              <p className="text-lg leading-relaxed">
                NeoMemory is a revolutionary memory management system that leverages advanced AI embeddings 
                to store, organize, and retrieve contextual information with unprecedented accuracy and speed.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Database className="w-6 h-6 text-blue-400" />
                    Semantic Storage
                  </h3>
                  <p>
                    Store any type of contextual information - from user preferences and project details 
                    to conversation history and technical documentation. Our AI converts everything into 
                    searchable vector embeddings.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Brain className="w-6 h-6 text-purple-400" />
                    Intelligent Search
                  </h3>
                  <p>
                    Find relevant memories using natural language queries. Our semantic search understands 
                    context and meaning, not just keywords, delivering precise results every time.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Code className="w-6 h-6 text-green-400" />
                    Developer Integration
                  </h3>
                  <p>
                    Seamlessly integrate with your development workflow through our REST API and MCP 
                    (Model Context Protocol) support for popular IDEs like Cursor and TRAE.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Shield className="w-6 h-6 text-red-400" />
                    Secure & Scalable
                  </h3>
                  <p>
                    Built with enterprise-grade security and scalability in mind. Your data is protected 
                    with API key authentication and stored securely in our cloud infrastructure.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Key Features */}
          <Card className="p-8 mb-12 bg-slate-900/50 border-slate-800 shadow-elegant">
            <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <Globe className="w-8 h-8 text-cyan-400" />
              Key Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="p-3 rounded-xl bg-blue-500/20 w-fit mx-auto mb-4">
                  <Brain className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">AI-Powered</h3>
                <p className="text-slate-400 text-sm">
                  Uses Cohere's advanced embedding models for intelligent memory organization
                </p>
              </div>

              <div className="text-center p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="p-3 rounded-xl bg-purple-500/20 w-fit mx-auto mb-4">
                  <Zap className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Lightning Fast</h3>
                <p className="text-slate-400 text-sm">
                  Sub-second search and retrieval with optimized vector similarity algorithms
                </p>
              </div>

              <div className="text-center p-6 rounded-lg bg-slate-800/50 border border-slate-700">
                <div className="p-3 rounded-xl bg-green-500/20 w-fit mx-auto mb-4">
                  <Code className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Developer Friendly</h3>
                <p className="text-slate-400 text-sm">
                  Easy-to-use API with comprehensive documentation and IDE integrations
                </p>
              </div>
            </div>
          </Card>

          {/* Use Cases */}
          <Card className="p-8 bg-slate-900/50 border-slate-800 shadow-elegant">
            <h2 className="text-3xl font-bold text-white mb-6">Use Cases</h2>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">🤖 AI Assistant Memory</h3>
                  <p className="text-slate-300">
                    Give your AI assistants persistent memory across conversations, allowing them to 
                    remember user preferences, context, and previous interactions.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">💼 Project Documentation</h3>
                  <p className="text-slate-300">
                    Store and retrieve project-specific information, technical decisions, and 
                    implementation details for easy reference during development.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">🎯 User Personalization</h3>
                  <p className="text-slate-300">
                    Build personalized experiences by storing user preferences, behavior patterns, 
                    and contextual information for better recommendations.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">📚 Knowledge Management</h3>
                  <p className="text-slate-300">
                    Create a searchable knowledge base of company information, best practices, 
                    and institutional knowledge that grows with your organization.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AboutUs;
