import { ManagerLayout } from '@/components/manager/ManagerLayout';
import { useManagerStats, useManagerResellers } from '@/hooks/useManagerData';
import { useLicenses } from '@/hooks/useLicenses';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Coins, Clock, TrendingUp, Key, CheckCircle, XCircle, Ban } from 'lucide-react';
import { differenceInDays, parseISO, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResellerPricingSettings } from '@/components/admin/ResellerPricingSettings';

export default function ManagerDashboard() {
  const { data: stats, isLoading: statsLoading } = useManagerStats();
  const { data: licenses, isLoading: licensesLoading } = useLicenses();
  const { data: resellers } = useManagerResellers();

  const licenseStats = {
    total: licenses?.length || 0,
    active: licenses?.filter(l => l.status === 'active').length || 0,
    expired: licenses?.filter(l => l.status === 'expired').length || 0,
    revoked: licenses?.filter(l => l.status === 'revoked').length || 0,
  };

  const expiringLicenses = licenses?.filter((l) => {
    if (l.status !== 'active') return false;
    const daysUntilExpiry = differenceInDays(parseISO(l.expires_at), new Date());
    return daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
  }) || [];

  const recentLicenses = licenses?.slice(0, 5) || [];

  return (
    <ManagerLayout>
      <div className="space-y-6 sm:space-y-8 px-1 sm:px-0 pt-12 lg:pt-0">
        <div className="animate-fade-up">
          <h1 className="text-xl sm:text-2xl font-bold text-gradient">Dashboard do Gerente</h1>
          <p className="text-sm text-muted-foreground mt-1">Visão geral de licenças e revendedores</p>
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 animate-fade-up-delay-1">
          <StatCard label="Total Licenças" value={licensesLoading ? '—' : licenseStats.total} icon={Key} />
          <StatCard label="Ativas" value={licensesLoading ? '—' : licenseStats.active} icon={CheckCircle} color="text-success" />
          <StatCard label="Expiradas" value={licensesLoading ? '—' : licenseStats.expired} icon={XCircle} color="text-warning" />
          <StatCard label="Revogadas" value={licensesLoading ? '—' : licenseStats.revoked} icon={Ban} color="text-destructive" />
        </div>

        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 animate-fade-up-delay-2">
          <StatCard label="Revendedores" value={statsLoading ? '—' : stats?.totalResellers} icon={Users} color="text-primary" />
          <StatCard label="Pendentes" value={statsLoading ? '—' : stats?.pendingResellers} icon={Clock} color="text-warning" />
          <StatCard label="Créditos Dados" value={statsLoading ? '—' : stats?.totalCredits} icon={Coins} color="text-success" />
          <StatCard label="Créditos Usados" value={statsLoading ? '—' : stats?.usedCredits} icon={TrendingUp} color="text-muted-foreground" />
        </div>

        <div className="grid gap-6 lg:grid-cols-2 animate-fade-up-delay-3">
          <Card className="glass-card rounded-2xl">
            <div className="p-5 pb-0">
              <h2 className="text-sm font-semibold text-gradient">Expirando em breve</h2>
            </div>
            <CardContent className="pt-4">
              {licensesLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : expiringLicenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma licença expirando nos próximos 7 dias</p>
              ) : (
                <div className="space-y-2">
                  {expiringLicenses.slice(0, 5).map((license) => {
                    const daysLeft = differenceInDays(parseISO(license.expires_at), new Date());
                    return (
                      <div key={license.id} className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                        <div>
                          <p className="font-mono text-xs">{license.license_key}</p>
                          <p className="text-[11px] text-muted-foreground">{license.email}</p>
                        </div>
                        <span className="text-xs font-medium text-warning">
                          {daysLeft === 0 ? 'Hoje' : `${daysLeft}d`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-2xl">
            <div className="p-5 pb-0">
              <h2 className="text-sm font-semibold text-gradient">Licenças Recentes</h2>
            </div>
            <CardContent className="pt-4">
              {licensesLoading ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : recentLicenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma licença encontrada</p>
              ) : (
                <div className="space-y-2">
                  {recentLicenses.map((license) => (
                    <div key={license.id} className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-2.5 hover:bg-muted/30 transition-colors">
                      <div>
                        <p className="font-mono text-xs">{license.license_key}</p>
                        <p className="text-[11px] text-muted-foreground">{license.email}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={license.status} />
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {format(parseISO(license.created_at), 'dd/MM/yy', { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reseller Pricing Settings */}
        <ResellerPricingSettings />
      </div>
    </ManagerLayout>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color?: string }) {
  return (
    <Card className="glass-card rounded-2xl hover:border-primary/20 transition-all duration-300 group">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
          <div className="p-1.5 rounded-lg bg-gradient-subtle group-hover:scale-110 transition-transform">
            <Icon className={`h-3.5 w-3.5 ${color || 'text-primary'}`} />
          </div>
        </div>
        <p className={`text-xl font-bold tabular-nums ${color || 'text-foreground'}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: { label: 'Ativa', className: 'bg-success/10 text-success' },
    expired: { label: 'Exp', className: 'bg-warning/10 text-warning' },
    revoked: { label: 'Rev', className: 'bg-destructive/10 text-destructive' },
  }[status] || { label: status, className: 'bg-muted text-muted-foreground' };

  return (
    <span className={`rounded-lg px-1.5 py-0.5 text-[10px] font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
