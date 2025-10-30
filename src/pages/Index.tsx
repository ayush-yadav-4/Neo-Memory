import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowRight, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    checkUser();
  }, [navigate]);

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
                Docs
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/connect')}
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Connect MCP
              </Button>
              <Button 
                variant="ghost" 
                onClick={() => navigate('/login')}
                className="text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
              <Button 
                onClick={() => navigate('/signup')}
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-2xl">
              <Brain className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              NeoMemory
            </h1>
          </div>
          
          <p className="text-xl text-slate-300 mb-8 leading-relaxed">
            Store, search, and manage memories using semantic similarity. 
            <br />
            <span className="text-blue-400">Powered by AI embeddings</span> for intelligent memory retrieval.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={() => navigate('/login')}
            >
              Get Started
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-3 text-lg font-semibold"
              onClick={() => navigate('/signup')}
            >
              Create Account
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant hover:shadow-xl transition-all duration-300">
              <div className="p-3 rounded-xl bg-blue-500/20 w-fit mx-auto mb-4">
                <Brain className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Semantic Search</h3>
              <p className="text-slate-400">
                Find memories using natural language queries with AI-powered semantic understanding.
              </p>
            </Card>

            <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant hover:shadow-xl transition-all duration-300">
              <div className="p-3 rounded-xl bg-purple-500/20 w-fit mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">AI Embeddings</h3>
              <p className="text-slate-400">
                Powered by Cohere's advanced embedding models for intelligent memory organization.
              </p>
            </Card>

            <Card className="p-6 bg-slate-900/50 border-slate-800 shadow-elegant hover:shadow-xl transition-all duration-300">
              <div className="p-3 rounded-xl bg-green-500/20 w-fit mx-auto mb-4">
                <ArrowRight className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Easy Integration</h3>
              <p className="text-slate-400">
                Simple REST API with MCP support for seamless integration with your applications.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;