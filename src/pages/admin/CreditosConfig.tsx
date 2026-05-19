import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Coins, Save, Loader2, Users2, ShoppingCart } from 'lucide-react';
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

export default function CreditosConfig() {
  const { toast } = useToast();
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});

  const fetchPrices = useCallback(async () => {
    const { data } = await supabase
      .from('system_config')
      .select('key, value')
      .like('key', 'creditos_pkg_%');
    const map: Record<number, string> = {};
    DEFAULT_PACKAGES.forEach((p) => {
      map[p.credits] = p.price.toFixed(2);
    });
    (data || []).forEach((c: any) => {
      const credits = parseInt(c.key.replace('creditos_pkg_', ''));
      if (credits) map[credits] = c.value;
    });
    setPrices(map);
  }, []);

  const fetchCustomers = useCallback(async () => {
    const { data } = await supabase
      .from('credits_customers')
      .select('id, user_id, name, phone, created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    setCustomers(data || []);
  }, []);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('lvb_credit_orders')
      .select('id, reseller_id, creditos, amount_cents, status, source, created_at, workspace_name')
      .eq('source', 'creditos_page')
      .order('created_at', { ascending: false })
      .limit(100);
    setOrders(data || []);

    const counts: Record<string, number> = {};
    (data || []).forEach((o: any) => {
      counts[o.reseller_id] = (counts[o.reseller_id] || 0) + 1;
    });
    setOrderCounts(counts);
  }, []);

  useEffect(() => {
    fetchPrices();
    fetchCustomers();
    fetchOrders();
  }, [fetchPrices, fetchCustomers, fetchOrders]);

  const savePrices = async () => {
    setSaving(true);
    try {
      for (const [credits, price] of Object.entries(prices)) {
        const key = `creditos_pkg_${credits}`;
        const { data: existing } = await supabase
          .from('system_config')
          .select('id')
          .eq('key', key)
          .maybeSingle();
        if (existing) {
          await supabase.from('system_config').update({ value: price }).eq('key', key);
        } else {
          await supabase
            .from('system_config')
            .insert({ key, value: price, description: `Preço pacote ${credits} créditos (página /creditos)` });
        }
      }
      toast({ title: 'Preços salvos!', description: 'Atualizações aplicadas à página /creditos.' });
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
      sucesso: { label: 'Entregue', variant: 'default' },
      entregue: { label: 'Entregue', variant: 'default' },
      falha: { label: 'Falha', variant: 'destructive' },
    };
    const info = map[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={info.variant} className="text-[10px]">{info.label}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Config Créditos (/creditos)</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Preços, clientes e pedidos da página pública de revenda de créditos.
          </p>
        </div>

        <Tabs defaultValue="pricing" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pricing" className="gap-1.5">
              <Coins className="h-3.5 w-3.5" /> Preços
            </TabsTrigger>
            <TabsTrigger value="customers" className="gap-1.5">
              <Users2 className="h-3.5 w-3.5" /> Clientes
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-1.5">
              <ShoppingCart className="h-3.5 w-3.5" /> Pedidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pricing">
            <Card className="rounded-2xl border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Coins className="h-4 w-4" /> Preços dos pacotes (/creditos)
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Estes preços são <strong>independentes</strong> dos preços do painel de revendedores.
                </p>
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
                          onChange={(e) => setPrices((prev) => ({ ...prev, [pkg.credits]: e.target.value }))}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        (padrão: R$ {pkg.price.toFixed(2)})
                      </span>
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

          <TabsContent value="customers">
            <Card className="rounded-2xl border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Cadastro</TableHead>
                    <TableHead className="text-xs">Nome</TableHead>
                    <TableHead className="text-xs">Telefone</TableHead>
                    <TableHead className="text-xs">User ID</TableHead>
                    <TableHead className="text-xs text-right">Pedidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">
                        {format(new Date(c.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-xs font-medium">{c.name}</TableCell>
                      <TableCell className="text-xs">{c.phone || '—'}</TableCell>
                      <TableCell className="text-xs font-mono">{c.user_id?.slice(0, 8)}...</TableCell>
                      <TableCell className="text-xs text-right font-bold">
                        {orderCounts[c.user_id] || 0}
                      </TableCell>
                    </TableRow>
                  ))}
                  {customers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
                        Nenhum cliente cadastrado pela página /creditos ainda.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="orders">
            <Card className="rounded-2xl border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Créditos</TableHead>
                    <TableHead className="text-xs">Valor</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Workspace</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="text-xs">
                        {format(new Date(o.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </TableCell>
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
                        Nenhum pedido vindo da página /creditos ainda.
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
