import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

  const handleSignup = async () => {
    if (!email || !password) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`${apiBase}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Signup failed');
      toast({ title: 'Success', description: 'Account created' });
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-6">
      <Card className="w-full max-w-md p-8 space-y-6 bg-slate-900/50 border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Sign Up</h1>
        </div>
        <div className="space-y-4">
          <div><Label className="text-slate-300">Email</Label><Input className="bg-slate-800 border-slate-700 text-white mt-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></div>
          <div><Label className="text-slate-300">Password</Label><Input type="password" className="bg-slate-800 border-slate-700 text-white mt-2" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
        </div>
        <Button onClick={handleSignup} disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
          {loading ? 'Creating account...' : (<><UserPlus className="w-4 h-4 mr-2" />Sign Up</>)}
        </Button>
        <Button variant="link" onClick={() => navigate('/login')} className="text-blue-400 hover:text-blue-300">Already have an account? Log in</Button>
        <Button variant="link" onClick={() => navigate('/')} className="text-slate-400">Back to home</Button>
      </Card>
    </div>
  );
};

export default Signup;

