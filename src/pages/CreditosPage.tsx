import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { CreditosPanel } from '@/components/creditos/CreditosPanel';
import CreditosLanding from './CreditosLanding';
import { Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function CreditosPage() {
  const { user, isLoading } = useAuth();

  // Detecta retorno do OAuth do Google e provisiona o perfil credits_customer
  useEffect(() => {
    if (!user) return;
    const url = new URL(window.location.href);
    const hash = window.location.hash;
    const isOAuthCallback = url.searchParams.has('code') || hash.includes('access_token');
    if (!isOAuthCallback) return;

    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.functions
        .invoke('register-credits-customer', {
          body: {
            name: user.user_metadata?.full_name || user.email?.split('@')[0],
          },
        })
        .catch(() => {});
    });
  }, [user]);

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
        <title>Créditos Lovable — Recarga rápida via PIX</title>
        <meta
          name="description"
          content="Compre créditos Lovable via PIX em segundos. Entrega automática e seguro."
        />
      </Helmet>
      {user ? <CreditosPanel /> : <CreditosLanding />}
    </>
  );
}
