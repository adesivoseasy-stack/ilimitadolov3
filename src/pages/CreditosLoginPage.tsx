import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { CreditosLogin } from '@/components/creditos/CreditosLogin';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';

export default function CreditosLoginPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const url = new URL(window.location.href);
    const hash = window.location.hash;
    const isOAuthCallback = url.searchParams.has('code') || hash.includes('access_token');

    if (isOAuthCallback) {
      supabase.functions
        .invoke('register-credits-customer', {
          body: { name: user.user_metadata?.full_name || user.email?.split('@')[0] },
        })
        .catch(() => {});
    }

    navigate('/creditos', { replace: true });
  }, [user, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Login — Créditos Lovable</title>
      </Helmet>
      <CreditosLogin onAuthenticated={() => navigate('/creditos', { replace: true })} />
    </>
  );
}
