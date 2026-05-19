import { ManagerLayout } from '@/components/manager/ManagerLayout';
import { useManagerResellers } from '@/hooks/useManagerData';
import { Card, CardContent } from '@/components/ui/card';
import { Coins } from 'lucide-react';

export default function ManagerCredits() {
  const { data: resellers, isLoading } = useManagerResellers();

  const totalCredits = resellers?.reduce((sum, r) => sum + r.credits_total, 0) || 0;
  const usedCredits = resellers?.reduce((sum, r) => sum + r.credits_used, 0) || 0;
  const availableCredits = totalCredits - usedCredits;

  return (
    <ManagerLayout>
      <div className="space-y-6 px-1 sm:px-0 pt-12 lg:pt-0">
        <div>
          <h1 className="text-lg font-medium text-foreground">Visão de Créditos</h1>
          <p className="text-sm text-muted-foreground">Resumo dos créditos distribuídos</p>
        </div>

        <div className="grid gap-3 grid-cols-3">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Total Distribuído</span>
              <p className="text-xl font-semibold tabular-nums text-foreground mt-1">{totalCredits}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Usados</span>
              <p className="text-xl font-semibold tabular-nums text-muted-foreground mt-1">{usedCredits}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Disponíveis</span>
              <p className="text-xl font-semibold tabular-nums text-success mt-1">{availableCredits}</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-sm font-medium text-muted-foreground">Por Revendedor</h2>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : (
          <div className="space-y-2">
            {resellers?.map((r) => {
              const avail = r.credits_total - r.credits_used;
              const pct = r.credits_total > 0 ? (r.credits_used / r.credits_total) * 100 : 0;
              return (
                <Card key={r.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        {r.company && <p className="text-xs text-muted-foreground">{r.company}</p>}
                      </div>
                      <div className="flex items-center gap-1 text-xs">
                        <Coins className="h-3 w-3 text-muted-foreground" />
                        <span className={avail <= 0 ? 'text-destructive font-medium' : 'text-success font-medium'}>{avail}</span>
                        <span className="text-muted-foreground">/ {r.credits_total}</span>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary rounded-full h-1.5 transition-all"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}
