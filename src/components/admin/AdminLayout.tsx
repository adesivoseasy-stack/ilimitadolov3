import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from './Sidebar';
import { Loader2 } from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, isAdmin, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) navigate('/auth');
      else if (!isAdmin) navigate('/auth');
    }
  }, [user, isAdmin, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[150px]" />
        </div>
        <Loader2 className="h-8 w-8 animate-spin text-primary relative z-10" />
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="flex min-h-screen bg-background relative overflow-x-hidden">
      {/* Ambient purple glow effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[400px] right-[10%] w-[900px] h-[900px] rounded-full bg-primary/[0.04] blur-[200px] animate-pulse-glow" />
        <div className="absolute top-[40%] -left-[300px] w-[700px] h-[700px] rounded-full bg-accent/[0.03] blur-[200px]" />
        <div className="absolute -bottom-[300px] right-[30%] w-[600px] h-[600px] rounded-full bg-primary/[0.03] blur-[180px]" />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: 'linear-gradient(hsl(265 80% 55% / 0.3) 1px, transparent 1px), linear-gradient(90deg, hsl(265 80% 55% / 0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />
      </div>
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden p-3 sm:p-6 lg:p-10 ml-0 lg:ml-[270px] relative z-10">
        <div className="max-w-[1400px] mx-auto min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
