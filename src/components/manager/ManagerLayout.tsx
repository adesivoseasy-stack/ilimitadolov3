import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ManagerSidebar } from './ManagerSidebar';
import { Loader2 } from 'lucide-react';

interface ManagerLayoutProps {
  children: ReactNode;
}

export function ManagerLayout({ children }: ManagerLayoutProps) {
  const { user, isManager, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        navigate('/auth');
      } else if (!isManager) {
        navigate('/auth');
      }
    }
  }, [user, isManager, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isManager) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <ManagerSidebar />
      <main className="flex-1 p-3 sm:p-5 lg:p-8 ml-0 lg:ml-[240px]">
        {children}
      </main>
    </div>
  );
}
