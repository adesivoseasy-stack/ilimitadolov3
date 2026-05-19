import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Clock, CheckCircle2, XCircle, Send, LogOut, RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

type ProfileRow = {
  id: string;
  user_id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
  approved_at: string | null;
};

export default function MyApprovals() {
  const { user, isLoading: authLoading, isReseller, isAdmin, isManager, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchProfile = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('reseller_profiles')
      .select('id, user_id, name, status, created_at, updated_at, approved_at')
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) {
      console.error('Erro ao carregar perfil:', error);
    } else {
      setProfile(data as ProfileRow | null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchProfile();

    const channel = supabase
      .channel(`my-approval-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reseller_profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const next = (payload.new ?? payload.old) as ProfileRow | null;
          if (next && 'status' in next) {
            setProfile((prev) => ({ ...(prev ?? next), ...next }));
            if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
              const oldStatus = (payload.old as ProfileRow).status;
              const newStatus = (payload.new as ProfileRow).status;
              if (oldStatus !== newStatus) {
                toast({
                  title: 'Status atualizado',
                  description: `Seu cadastro agora está: ${newStatus}`,
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const requestApproval = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      if (!profile) {
        const { data, error } = await supabase
          .from('reseller_profiles')
          .insert({
            user_id: user.id,
            name: user.email?.split('@')[0] ?? 'Revendedor',
            status: 'pending',
          })
          .select('id, user_id, name, status, created_at, updated_at, approved_at')
          .maybeSingle();
        if (error) throw error;
        setProfile(data as ProfileRow);
        toast({
          title: 'Solicitação enviada',
          description: 'Sua solicitação de aprovação foi registrada.',
        });
      } else {
        const { data, error } = await supabase
          .from('reseller_profiles')
          .update({ updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .select('id, user_id, name, status, created_at, updated_at, approved_at')
          .maybeSingle();
        if (error) throw error;
        if (data) setProfile(data as ProfileRow);
        toast({
          title: 'Solicitação reforçada',
          description: 'Avisamos a equipe que você aguarda revisão.',
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (isAdmin) return <Navigate to="/dashboard" replace />;
  if (isManager) return <Navigate to="/manager/dashboard" replace />;
  if (isReseller && profile?.status === 'approved') {
    return <Navigate to="/reseller/dashboard" replace />;
  }

  const status = profile?.status ?? 'none';

  const statusConfig: Record<string, { label: string; icon: any; className: string; description: string }> = {
    none: {
      label: 'Não solicitado',
      icon: Send,
      className: 'bg-muted text-muted-foreground border-border',
      description: 'Você ainda não solicitou aprovação como revendedor.',
    },
    pending: {
      label: 'Aguardando aprovação',
      icon: Clock,
      className: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
      description: 'Sua solicitação está na fila de revisão da nossa equipe.',
    },
    approved: {
      label: 'Aprovado',
      icon: CheckCircle2,
      className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
      description: 'Tudo certo! Você já tem acesso ao painel do revendedor.',
    },
    rejected: {
      label: 'Recusado',
      icon: XCircle,
      className: 'bg-destructive/10 text-destructive border-destructive/30',
      description: 'Sua solicitação foi recusada. Entre em contato com o suporte.',
    },
  };

  const cfg = statusConfig[status] ?? statusConfig.none;
  const StatusIcon = cfg.icon;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <Helmet>
        <title>Minhas Aprovações | Painel Revendedor</title>
        <meta name="description" content="Acompanhe em tempo real o status da sua solicitação de aprovação como revendedor." />
      </Helmet>

      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-2xl mx-auto px-6 py-16">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold font-display tracking-tight">
              Minhas Aprovações
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Acompanhe o status da sua solicitação em tempo real
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        <Card className="border-primary/10 bg-card/60 backdrop-blur-xl shadow-2xl shadow-primary/5">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-display">Status do cadastro</CardTitle>
                <CardDescription className="mt-1">{user.email}</CardDescription>
              </div>
              <Badge variant="outline" className={`${cfg.className} px-3 py-1.5 text-xs font-semibold gap-1.5`}>
                <StatusIcon className="h-3.5 w-3.5" />
                {cfg.label}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="rounded-xl border border-border/40 bg-muted/30 p-5">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${cfg.className}`}>
                  <StatusIcon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">{cfg.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cfg.description}</p>
                </div>
              </div>

              {profile && (
                <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-border/40">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Solicitado em</p>
                    <p className="text-sm text-foreground mt-1">
                      {new Date(profile.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Atualizado em</p>
                    <p className="text-sm text-foreground mt-1">
                      {new Date(profile.updated_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  {profile.approved_at && (
                    <div className="col-span-2">
                      <p className="text-[10px] uppercase tracking-wider text-emerald-500 font-semibold">Aprovado em</p>
                      <p className="text-sm text-foreground mt-1">
                        {new Date(profile.approved_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              Atualizando em tempo real
            </div>

            {status === 'approved' ? (
              <Button
                className="w-full h-12 bg-gradient text-primary-foreground"
                onClick={() => (window.location.href = '/reseller/dashboard')}
              >
                Acessar painel do revendedor
              </Button>
            ) : status === 'rejected' ? (
              <Button variant="outline" className="w-full h-12" onClick={fetchProfile}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar status
              </Button>
            ) : (
              <Button
                className="w-full h-12 bg-gradient text-primary-foreground hover:opacity-90"
                onClick={requestApproval}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {profile ? 'Reenviar solicitação' : 'Solicitar aprovação'}
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Precisa de ajuda? Entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
}
