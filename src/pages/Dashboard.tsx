import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLicenseStats, useLicenses, useWildcardUsage, useWildcardStats } from '@/hooks/useLicenses';
import { Card, CardContent } from '@/components/ui/card';
import { Key, CheckCircle, XCircle, Ban, DollarSign, Globe, Users, TrendingUp, Activity, ArrowUpRight } from 'lucide-react';
import adminBannerAsset from '@/assets/banner.gif.asset.json';
import { format, differenceInDays, parseISO, formatDistanceToNow, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GitHubCalendar } from '@/components/ui/git-hub-calendar';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useLicenseStats();
  const { data: licenses, isLoading: licensesLoading } = useLicenses();
  const { data: wildcardUsage, isLoading: wildcardLoading } = useWildcardUsage();
  const { data: wildcardStats } = useWildcardStats();

  const { data: dailyCounts } = useQuery({
    queryKey: ['activity-daily-counts'],
    queryFn: async () => {
      const startDate = subDays(new Date(), 364).toISOString();
      const paginateFetch = async (selectFn: (from: number, to: number) => Promise<{ data: any[] | null; error: any }>, dateKey: string) => {
        let allDates: string[] = [];
        let from = 0;
        const pageSize = 1000;
        while (true) {
          const { data, error } = await selectFn(from, from + pageSize - 1);
          if (error) throw error;
          if (!data || data.length === 0) break;
          allDates = allDates.concat(data.map((r: any) => r[dateKey]));
          if (data.length < pageSize) break;
          from += pageSize;
        }
        return allDates;
      };
      const [logDates, licenseDates, sessionDates, deviceDates] = await Promise.all([
        paginateFetch(async (f, t) => await supabase.from('license_logs').select('created_at').gte('created_at', startDate).range(f, t), 'created_at'),
        paginateFetch(async (f, t) => await supabase.from('licenses').select('created_at').gte('created_at', startDate).range(f, t), 'created_at'),
        paginateFetch(async (f, t) => await supabase.from('sessions').select('created_at').gte('created_at', startDate).range(f, t), 'created_at'),
        paginateFetch(async (f, t) => await supabase.from('devices').select('activated_at').gte('activated_at', startDate).range(f, t), 'activated_at'),
      ]);
      const allDates = [...logDates, ...licenseDates, ...sessionDates, ...deviceDates];
      const countMap: Record<string, number> = {};
      allDates.forEach(d => {
        const day = format(parseISO(d), 'yyyy-MM-dd');
        countMap[day] = (countMap[day] || 0) + 1;
      });
      return countMap;
    }
  });

  const contributionData = useMemo(() => {
    const today = new Date();
    const start = subDays(today, 364);
    const allDays = eachDayOfInterval({ start, end: today });
    return allDays.map(day => ({
      date: format(day, 'yyyy-MM-dd'),
      count: dailyCounts?.[format(day, 'yyyy-MM-dd')] || 0,
    }));
  }, [dailyCounts]);

  const expiringLicenses = licenses?.filter((l) => {
    if (l.status !== 'active') return false;
    const daysUntilExpiry = differenceInDays(parseISO(l.expires_at), new Date());
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  }) || [];

  const recentLicenses = licenses?.slice(0, 5) || [];
  const recentWildcardUsage = wildcardUsage?.slice(0, 10) || [];

  return (
    <AdminLayout>
      <div className="space-y-6 sm:space-y-8 px-1 sm:px-0">
        {/* Hero Header */}
        <div className="animate-fade-up pt-14 lg:pt-0">
          <div className="mb-6 sm:mb-8">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2 sm:mb-3 font-display">Painel de Controle</p>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gradient-white font-display leading-[1.1]">
              Dashboard
            </h1>
            <p className="text-base text-muted-foreground mt-3 max-w-md">
              Visão geral completa do seu sistema de licenças e métricas.
            </p>
          </div>

          {/* Banner */}
          <div className="w-full rounded-2xl overflow-hidden border border-border/20 glow-card purple-glow">
            <img src={adminBannerAsset.url} alt="Ilimitado Lov Banner" className="w-full h-auto object-contain" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 animate-fade-up-delay-1">
          <StatCard label="Total" value={statsLoading ? '—' : stats?.total} icon={Key} />
          <StatCard label="Ativas" value={statsLoading ? '—' : stats?.active} icon={CheckCircle} color="text-success" glowColor="hsl(152 55% 42%)" />
          <StatCard label="Expiradas" value={statsLoading ? '—' : stats?.expired} icon={XCircle} color="text-warning" glowColor="hsl(38 75% 50%)" />
          <StatCard label="Revogadas" value={statsLoading ? '—' : stats?.revoked} icon={Ban} color="text-destructive" glowColor="hsl(0 62.8% 50%)" />
          <StatCard label="Receita" value={statsLoading ? '—' : `R$ ${stats?.revenue.toFixed(0)}`} icon={DollarSign} color="text-primary" glowColor="hsl(265 80% 55%)" />
        </div>

        {/* Activity Calendar */}
        <GlassSection icon={Activity} title="Atividade" subtitle="últimos 365 dias" className="animate-fade-up-delay-2">
          <div className="overflow-x-auto scrollbar-none">
            <GitHubCalendar 
              data={contributionData}
              colors={["hsl(var(--muted))", "#9b6dff", "#8b5cf6", "#7c3aed", "#6d28d9"]}
            />
          </div>
        </GlassSection>

        {/* Wildcard Stats */}
        {wildcardStats && (wildcardStats.totalIPs > 0 || wildcardStats.totalMessages > 0) && (
          <div className="grid gap-4 grid-cols-2 animate-fade-up-delay-2">
            <StatCard label="IPs Coringa" value={wildcardStats.totalIPs} icon={Globe} />
            <StatCard label="Mensagens" value={wildcardStats.totalMessages} icon={Users} />
          </div>
        )}

        <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 animate-fade-up-delay-2 min-w-0">
          {/* Wildcard Usage */}
          <GlassSection icon={Globe} title="Chave Coringa" badge={`${recentWildcardUsage.length}`}>
            {wildcardLoading ? (
              <LoadingText />
            ) : recentWildcardUsage.length === 0 ? (
              <EmptyState icon={Globe} message="Nenhum uso registrado" />
            ) : (
              <div className="space-y-2 max-h-[360px] overflow-y-auto overflow-x-hidden scrollbar-none min-w-0">
                {recentWildcardUsage.map((usage) => (
                  <ListRow key={usage.id}>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <code className="block font-mono text-[11px] sm:text-[13px] font-semibold text-foreground break-all sm:break-normal">{usage.ip_address}</code>
                      <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                        {formatDistanceToNow(parseISO(usage.last_used_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    <span className="text-xs font-bold tabular-nums text-primary font-display shrink-0">
                      {usage.message_count}
                    </span>
                  </ListRow>
                ))}
              </div>
            )}
          </GlassSection>

          {/* Expiring Soon */}
          <GlassSection icon={XCircle} title="Expirando" badge={`${expiringLicenses.length}`} iconColor="text-warning">
            {licensesLoading ? (
              <LoadingText />
            ) : expiringLicenses.length === 0 ? (
              <EmptyState icon={CheckCircle} message="Nenhuma licença expirando" color="text-success/30" />
            ) : (
              <div className="space-y-2 min-w-0">
                {expiringLicenses.map((license) => {
                  const daysLeft = differenceInDays(parseISO(license.expires_at), new Date());
                  return (
                    <ListRow key={license.id}>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[11px] sm:text-[13px] font-semibold text-foreground truncate">{license.license_key.slice(0, 16)}...</p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{license.email}</p>
                      </div>
                      <span className={`text-[10px] sm:text-xs font-black px-2.5 sm:px-3 py-1.5 rounded-xl font-display shrink-0 ${
                        daysLeft <= 1 
                          ? 'bg-destructive/15 text-destructive border border-destructive/20' 
                          : 'bg-warning/15 text-warning border border-warning/20'
                      }`}>
                        {daysLeft === 0 ? 'HOJE' : `${daysLeft}D`}
                      </span>
                    </ListRow>
                  );
                })}
              </div>
            )}
          </GlassSection>
        </div>

        {/* Recent Licenses */}
        <GlassSection icon={Key} title="Licenças Recentes" className="animate-fade-up-delay-3">
          {licensesLoading ? (
            <LoadingText />
          ) : recentLicenses.length === 0 ? (
            <EmptyState icon={Key} message="Nenhuma licença encontrada" />
          ) : (
            <div className="space-y-2">
              {recentLicenses.map((license) => (
                <ListRow key={license.id}>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] sm:text-[13px] font-semibold text-foreground truncate">{license.license_key}</p>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">{license.email}</p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <StatusBadge status={license.status} />
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground tabular-nums hidden sm:inline font-display">
                      {format(parseISO(license.created_at), 'dd/MM/yy', { locale: ptBR })}
                    </span>
                  </div>
                </ListRow>
              ))}
            </div>
          )}
        </GlassSection>
      </div>
    </AdminLayout>
  );
}

/* ─── Sub-components ─── */

function GlassSection({ icon: Icon, title, subtitle, badge, children, className, iconColor = 'text-primary' }: {
  icon: any; title: string; subtitle?: string; badge?: string; children: React.ReactNode; className?: string; iconColor?: string;
}) {
  return (
    <div className={`glass-card rounded-2xl overflow-hidden min-w-0 ${className || ''}`}>
      <div className="p-4 sm:p-6 pb-0 flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10 shrink-0">
            <Icon className={`h-4 w-4 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-foreground font-display truncate">{title}</h2>
            {subtitle && <p className="text-[10px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
        </div>
        {badge && (
          <span className="text-[10px] sm:text-[11px] font-bold text-primary bg-primary/10 px-2.5 sm:px-3 py-1.5 rounded-xl border border-primary/10 font-display shrink-0">
            {badge}
          </span>
        )}
      </div>
      <div className="p-4 sm:p-6 min-w-0">{children}</div>
    </div>
  );
}

function ListRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/20 bg-background/20 px-3 sm:px-4 py-3 hover:bg-primary/[0.03] hover:border-primary/10 transition-all duration-200 gap-2 sm:gap-3 group min-w-0 overflow-hidden">
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, message, color = 'text-muted-foreground/20' }: { icon: any; message: string; color?: string }) {
  return (
    <div className="text-center py-12">
      <Icon className={`h-10 w-10 ${color} mx-auto mb-4`} />
      <p className="text-sm text-muted-foreground font-display">{message}</p>
    </div>
  );
}

function LoadingText() {
  return <p className="text-sm text-muted-foreground font-display">Carregando...</p>;
}

function StatCard({ label, value, icon: Icon, color, glowColor }: { label: string; value: any; icon: any; color?: string; glowColor?: string }) {
  return (
    <div className="glass-card-hover rounded-2xl overflow-hidden relative group">
      {/* Top accent line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[2px] opacity-60 group-hover:opacity-100 transition-opacity"
        style={{ background: glowColor || 'hsl(265 80% 55%)' }}
      />
      <div className="p-3.5 sm:p-5">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display truncate">{label}</span>
          <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/[0.06] group-hover:bg-primary/10 transition-colors duration-300">
            <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${color || 'text-primary'}`} />
          </div>
        </div>
        <p className={`text-2xl sm:text-3xl lg:text-4xl font-black tabular-nums tracking-tight font-display ${color || 'text-foreground'}`}>{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: { label: 'ATIVA', className: 'bg-success/15 text-success border-success/20' },
    expired: { label: 'EXP', className: 'bg-warning/15 text-warning border-warning/20' },
    revoked: { label: 'REV', className: 'bg-destructive/15 text-destructive border-destructive/20' },
  }[status] || { label: status, className: 'bg-muted text-muted-foreground border-border' };

  return (
    <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black font-display ${config.className}`}>
      {config.label}
    </span>
  );
}
