import { ManagerLayout } from '@/components/manager/ManagerLayout';
import { useManagerResellers } from '@/hooks/useManagerData';
import { useLicenses } from '@/hooks/useLicenses';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageCircle, AlertTriangle, UserX, Filter } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { useState } from 'react';

export default function ManagerRemarketing() {
  const { data: resellers, isLoading: resellersLoading } = useManagerResellers();
  const { data: licenses, isLoading: licensesLoading } = useLicenses();
  const [minDays, setMinDays] = useState<string>('all');

  const isLoading = resellersLoading || licensesLoading;

  // Resellers with 0 active licenses
  const inactiveResellers = (resellers?.filter(r => {
    const hasActiveLicense = licenses?.some(
      l => l.created_by === r.user_id && l.status === 'active'
    );
    if (hasActiveLicense) return false;
    if (minDays === 'all') return true;
    const days = differenceInDays(new Date(), parseISO(r.created_at));
    return days >= Number(minDays);
  }) || []).sort((a, b) => 
    differenceInDays(new Date(), parseISO(b.created_at)) - differenceInDays(new Date(), parseISO(a.created_at))
  );

  const buildWhatsAppUrl = (reseller: typeof inactiveResellers[0]) => {
    const phone = reseller.phone?.replace(/\D/g, '') || '';
    const days = differenceInDays(new Date(), parseISO(reseller.created_at));
    const message = `Olá ${reseller.name}! 👋

Notamos que você entrou na plataforma há *${days} dias* e ainda não possui nenhuma chave ativa.

🔥 Temos uma *oferta especial* pra você:
✅ *1 chave com desconto exclusivo* para você começar agora!

⚠️ Contas sem atividade podem ser *desativadas por inatividade*.

Quer aproveitar essa oportunidade? Responda aqui! 🚀`;

    return `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
  };

  return (
    <ManagerLayout>
      <div className="space-y-6 sm:space-y-8 px-1 sm:px-0 pt-12 lg:pt-0">
        <div className="animate-fade-up">
          <h1 className="text-xl sm:text-2xl font-bold text-gradient">Remarketing</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revendedores sem chaves ativas — envie uma mensagem de remarketing
          </p>
        </div>

        <div className="grid gap-3 grid-cols-2 animate-fade-up-delay-1">
          <Card className="glass-card rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Sem Chaves</span>
                <UserX className="h-3.5 w-3.5 text-warning" />
              </div>
              <p className="text-xl font-bold tabular-nums text-warning">{isLoading ? '—' : inactiveResellers.length}</p>
            </CardContent>
          </Card>
          <Card className="glass-card rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Total Aprovados</span>
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-xl font-bold tabular-nums text-foreground">{isLoading ? '—' : resellers?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-3 animate-fade-up-delay-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={minDays} onValueChange={setMinDays}>
            <SelectTrigger className="w-[200px] rounded-xl">
              <SelectValue placeholder="Filtrar por dias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="1">+1 dia</SelectItem>
              <SelectItem value="3">+3 dias</SelectItem>
              <SelectItem value="7">+7 dias</SelectItem>
              <SelectItem value="14">+14 dias</SelectItem>
              <SelectItem value="30">+30 dias</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">{inactiveResellers.length} resultado(s)</span>
        </div>

        <Card className="glass-card rounded-2xl animate-fade-up-delay-2">
          <div className="p-5 pb-0">
            <h2 className="text-sm font-semibold text-gradient">Revendedores Inativos</h2>
          </div>
          <CardContent className="pt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : inactiveResellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todos os revendedores possuem chaves ativas 🎉</p>
            ) : (
              <div className="space-y-2">
                {inactiveResellers.map((reseller) => {
                  const daysSinceJoin = differenceInDays(new Date(), parseISO(reseller.created_at));
                  const hasPhone = !!reseller.phone;

                  return (
                    <div
                      key={reseller.id}
                      className="flex items-center justify-between rounded-xl border border-border/50 px-3 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{reseller.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {reseller.company || 'Sem empresa'} • {reseller.phone || 'Sem telefone'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-medium text-warning tabular-nums">
                          {daysSinceJoin}d
                        </span>
                        {hasPhone ? (
                          <a href={buildWhatsAppUrl(reseller)} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" className="h-8 rounded-xl gap-1.5 text-xs">
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">WhatsApp</span>
                            </Button>
                          </a>
                        ) : (
                          <Button size="sm" className="h-8 rounded-xl gap-1.5 text-xs" disabled>
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">WhatsApp</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ManagerLayout>
  );
}
