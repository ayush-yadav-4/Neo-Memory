import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChatInterface } from "@/components/chat/ChatInterface"

export default function Chat() {
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication by trying to fetch user session
    const checkAuth = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';
        const response = await fetch(`${apiBase}/auth/me`, { credentials: 'include' });
        const data = await response.json();
        if (!data.authenticated) {
          navigate('/login');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <ChatInterface />
    </div>
  )
}

