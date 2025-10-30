import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const AuthSection = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<string>('');
  const { toast } = useToast();
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

  const checkMe = async () => {
    const resp = await fetch(`${apiBase}/auth/me`, { credentials: 'include' });
    const data = await resp.json();
    setStatus(data.authenticated ? `Signed in as ${data.user?.email}` : 'Not signed in');
  };

  useEffect(() => { checkMe(); }, []);

  const signup = async () => {
    try {
      const resp = await fetch(`${apiBase}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Signup failed');
      toast({ title: 'Signed up', description: 'Account created and signed in' });
      setEmail(''); setPassword('');
      setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const login = async () => {
    try {
      const resp = await fetch(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Login failed');
      toast({ title: 'Signed in', description: 'Welcome back' });
      setEmail(''); setPassword('');
      setTimeout(() => window.location.reload(), 500);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    }
  };

  const logout = async () => {
    await fetch(`${apiBase}/auth/logout`, { method: 'POST', credentials: 'include' });
    toast({ title: 'Signed out' });
    setTimeout(() => window.location.reload(), 500);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="text-sm text-muted-foreground">Session: {status}</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={signup}>Sign up</Button>
        <Button variant="outline" onClick={login}>Log in</Button>
        <Button variant="ghost" onClick={logout}>Log out</Button>
      </div>
      <div className="text-xs text-muted-foreground">Session persists for 3 days.</div>
    </Card>
  );
};

export default AuthSection;


