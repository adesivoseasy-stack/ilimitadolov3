import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useLvbCredits } from '@/hooks/useLvbCredits';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, RefreshCw, Coins, Save, Loader2, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DEFAULT_PACKAGES = [
  { credits: 100, price: 8.90 },
  { credits: 200, price: 16.90 },
  { credits: 300, price: 23.90 },
  { credits: 500, price: 38.90 },
  { credits: 1000, price: 74.90 },
  { credits: 2000, price: 143.90 },
  { credits: 3000, price: 209.90 },
  { credits: 5000, price: 339.90 },
];

export default function LvbCreditsAdmin() {
  const { toast } = useToast();
  const lvb = useLvbCredits();
  const [balance, setBalance] = useState<{ saldoCentavos: number; saldoReais: string } | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(false);

  const fetchBalance = useCallback(async () => {
    setLoadingBalance(true);
    const res = await lvb.getBalance();
    if (res?.success) setBalance(res.data);
    setLoadingBalance(false);
  }, [lvb]);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('lvb_credit_orders' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setOrders(data as any[]);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    const { data } = await supabase
      .from('security_audit_logs' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setAuditLogs(data as any[]);
  }, []);

  const fetchPrices = useCallback(async () => {
    const { data } = await supabase
      .from('system_config')
      .select('key, value')
      .like('key', 'lvb_package_%');

    const priceMap: Record<number, string> = {};
    DEFAULT_PACKAGES.forEach(p => { priceMap[p.credits] = p.price.toFixed(2); });
    (data || []).forEach((c: any) => {
      const credits = parseInt(c.key.replace('lvb_package_', ''));
      if (credits) priceMap[credits] = c.value;
    });
    setPrices(priceMap);
  }, []);

  useEffect(() => { fetchBalance(); fetchOrders(); fetchPrices(); fetchAuditLogs(); }, []);

  const savePrices = async () => {
    setSaving(true);
    try {
      for (const [credits, price] of Object.entries(prices)) {
        const key = `lvb_package_${credits}`;
        const defaultPkg = DEFAULT_PACKAGES.find(p => p.credits === parseInt(credits));
        const isDefault = defaultPkg && parseFloat(price) === defaultPkg.price;

        if (isDefault) {
          // Delete custom price if it equals default
          await supabase.from('system_config').delete().eq('key', key);
        } else {
          // Upsert custom price
          const { data: existing } = await supabase.from('system_config').select('id').eq('key', key).single();
          if (existing) {
            await supabase.from('system_config').update({ value: price }).eq('key', key);
          } else {
            await supabase.from('system_config').insert({ key, value: price, description: `Preço do pacote LVB ${credits} créditos` });
          }
        }
      }
      toast({ title: 'Preços salvos!', description: 'Os preços dos pacotes foram atualizados.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending_payment: { label: 'Aguardando PIX', variant: 'outline' },
      paid: { label: 'Pago', variant: 'secondary' },
      configurando: { label: 'Configurando', variant: 'secondary' },
      recarregando: { label: 'Recarregando', variant: 'default' },
      sucesso: { label: 'Sucesso', variant: 'default' },
      falha: { label: 'Falha', variant: 'destructive' },
    };
    const info = map[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={info.variant} className="text-[10px]">{info.label}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">LVB Credits</h1>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="orders">Pedidos</TabsTrigger>
            <TabsTrigger value="pricing">Preços</TabsTrigger>
            <TabsTrigger value="audit" className="gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              Auditoria
              {auditLogs.length > 0 && (
                <Badge variant="destructive" className="text-[9px] h-4 px-1 ml-1">{auditLogs.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card className="rounded-2xl border-border/50">
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Wallet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Saldo da Conta LVB</p>
                    <p className="text-xl font-bold text-foreground">
                      {loadingBalance ? <Loader2 className="h-5 w-5 animate-spin" /> : balance ? `R$ ${balance.saldoReais}` : '—'}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={fetchBalance} disabled={loadingBalance}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <div className="grid grid-cols-3 gap-4">
              <Card className="rounded-2xl border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">{orders.length}</p>
                  <p className="text-xs text-muted-foreground">Total Pedidos</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-green-500">{orders.filter(o => (o as any).status === 'sucesso').length}</p>
                  <p className="text-xs text-muted-foreground">Entregues</p>
                </CardContent>
              </Card>
              <Card className="rounded-2xl border-border/50">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-amber-500">{orders.filter(o => ['pending_payment', 'configurando', 'recarregando'].includes((o as any).status)).length}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="rounded-2xl border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Revendedor</TableHead>
                    <TableHead className="text-xs">Créditos</TableHead>
                    <TableHead className="text-xs">Valor</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Workspace</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o: any) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs">{format(new Date(o.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                      <TableCell className="text-xs font-mono">{o.reseller_id?.slice(0, 8)}...</TableCell>
                      <TableCell className="text-xs font-bold">{o.creditos}</TableCell>
                      <TableCell className="text-xs">R$ {(o.amount_cents / 100).toFixed(2)}</TableCell>
                      <TableCell>{statusBadge(o.status)}</TableCell>
                      <TableCell className="text-xs">{o.workspace_name || '—'}</TableCell>
                    </TableRow>
                  ))}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                        Nenhum pedido encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card className="rounded-2xl border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Coins className="h-4 w-4" />
                  Configuração de Preços dos Pacotes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {DEFAULT_PACKAGES.map((pkg) => (
                    <div key={pkg.credits} className="flex items-center gap-4">
                      <span className="w-24 text-sm font-bold">{pkg.credits} créditos</span>
                      <div className="flex items-center gap-2 flex-1 max-w-xs">
                        <span className="text-sm text-muted-foreground">R$</span>
                        <Input
                          type="number"
                          step="0.01"
                          className="h-9"
                          value={prices[pkg.credits] || pkg.price.toFixed(2)}
                          onChange={(e) => setPrices(prev => ({ ...prev, [pkg.credits]: e.target.value }))}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">(padrão: R$ {pkg.price.toFixed(2)})</span>
                    </div>
                  ))}
                </div>
                <Button onClick={savePrices} disabled={saving} className="rounded-xl gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar Preços
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card className="rounded-2xl border-border/50 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-destructive" />
                  Tentativas Bloqueadas
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Registro de chamadas não autorizadas à API de créditos (create-order, set-delivery sem pagamento confirmado)
                </p>
              </CardHeader>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Usuário</TableHead>
                    <TableHead className="text-xs">Ação</TableHead>
                    <TableHead className="text-xs">Roles</TableHead>
                    <TableHead className="text-xs">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">{format(new Date(log.created_at), 'dd/MM/yy HH:mm:ss', { locale: ptBR })}</TableCell>
                      <TableCell className="text-xs">
                        <div>{(log.details as any)?.user_email || '—'}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">{log.user_id?.slice(0, 8)}...</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive" className="text-[10px]">{log.action}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {((log.details as any)?.roles || []).join(', ')}
                      </TableCell>
                      <TableCell className="text-xs font-mono max-w-[200px] truncate">
                        {JSON.stringify((log.details as any)?.params || {})}
                      </TableCell>
                    </TableRow>
                  ))}
                  {auditLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                        Nenhuma tentativa bloqueada registrada ✅
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
