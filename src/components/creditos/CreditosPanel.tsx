import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCreditosCustomer } from '@/hooks/useCreditosCustomer';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Coins, LogOut, Bell, Store, Package, Minus, Plus, Loader2,
  Copy, CheckCircle2, ShieldCheck, Clock, QrCode, RotateCcw,
} from 'lucide-react';
import { PixCustomerDialog, PixCustomerFormData } from '@/components/reseller/PixCustomerDialog';
import { RequirementsDialog } from '@/components/creditos/RequirementsDialog';
import { PixQrCode } from '@/components/reseller/PixQrCode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import logoImg from '@/assets/logo.webp';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const QUICK_QUANTITIES = [100, 200, 300, 500, 1000, 2000, 3000, 5000];

const DEFAULT_PRICES: Record<number, number> = {
  100: 18.90, 200: 25.90, 300: 32.90,
  500: 45.90, 1000: 99.90, 2000: 189.90, 3000: 269.90, 5000: 439.90,
};

const PRICE_TABLE_PACKAGES = [100, 200, 300, 500, 1000, 2000, 3000, 5000];

interface PixState {
  orderId: string;
  pixCodeText: string;
  amountCents: number;
  creditos: number;
}

const PIX_STORAGE_KEY = 'creditos_pending_pix';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    pending_payment: { label: 'Aguardando PIX', className: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
    paid: { label: 'Pago', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    configurando: { label: 'Configurando', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    recarregando: { label: 'Recarregando', className: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
    sucesso: { label: 'Entregue', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    entregue: { label: 'Entregue', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
    falha: { label: 'Falha', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  };
  const info = map[status] || { label: status, className: 'bg-muted/30 text-muted-foreground border-border/40' };
  return (
    <Badge variant="outline" className={`text-[10px] font-semibold ${info.className}`}>
      {info.label}
    </Badge>
  );
}

export function CreditosPanel() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { profile, ensureProfile } = useCreditosCustomer();

  const [prices, setPrices] = useState<Record<number, number>>(DEFAULT_PRICES);
  const [orders, setOrders] = useState<any[]>([]);
  const [quantity, setQuantity] = useState<number>(100);
  const [orderRef, setOrderRef] = useState('');
  const [pixDialogOpen, setPixDialogOpen] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixState, setPixState] = useState<PixState | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchPrices = useCallback(async () => {
    const { data } = await supabase
      .from('system_config')
      .select('key, value')
      .like('key', 'creditos_pkg_%');
    const next = { ...DEFAULT_PRICES };
    (data || []).forEach((c: any) => {
      const credits = parseInt(c.key.replace('creditos_pkg_', ''));
      if (credits && c.value) next[credits] = parseFloat(c.value);
    });
    setPrices(next);
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('lvb_credit_orders')
      .select('*')
      .eq('reseller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    if (data) setOrders(data);
  }, [user?.id]);

  useEffect(() => {
    fetchPrices();
    fetchOrders();
  }, [fetchPrices, fetchOrders]);

  // Restaura PIX pendente do localStorage ao recarregar a página
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(PIX_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as PixState & { userId: string };
      if (saved.userId !== user.id) return;
      // Verifica se ainda está aguardando pagamento
      supabase
        .from('lvb_credit_orders')
        .select('status')
        .eq('id', saved.orderId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.status === 'pending_payment') {
            setPixState({
              orderId: saved.orderId,
              pixCodeText: saved.pixCodeText,
              amountCents: saved.amountCents,
              creditos: saved.creditos,
            });
          } else {
            localStorage.removeItem(PIX_STORAGE_KEY);
          }
        });
    } catch {
      localStorage.removeItem(PIX_STORAGE_KEY);
    }
  }, [user?.id]);

  // Garante perfil ao entrar (caso login via Google sem cadastro prévio)
  useEffect(() => {
    if (user && !profile) {
      ensureProfile(user.user_metadata?.full_name || user.email?.split('@')[0]).catch(() => {});
    }
  }, [user, profile, ensureProfile]);

  // Polling do pedido aguardando pagamento (roda enquanto há pixState, mesmo com modal fechado)
  useEffect(() => {
    if (!pixState?.orderId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('lvb_credit_orders')
        .select('status')
        .eq('id', pixState.orderId)
        .maybeSingle();
      if (data && data.status !== 'pending_payment') {
        clearInterval(interval);
        setShowPixModal(false);
        setPixState(null);
        localStorage.removeItem(PIX_STORAGE_KEY);
        fetchOrders();
        toast({
          title: '✅ Pagamento confirmado!',
          description: 'Seu pedido está sendo processado. Você receberá os créditos em breve.',
        });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [pixState?.orderId, fetchOrders, toast]);

  const unitPrice = useMemo(() => {
    if (prices[quantity]) return prices[quantity];
    // Interpolação linear baseada no preço de 100 créditos
    const base = prices[100] || DEFAULT_PRICES[100];
    return (base / 100) * quantity;
  }, [quantity, prices]);

  const total = unitPrice;

  const handleQuickQty = (q: number) => setQuantity(q);

  const handleCreateOrder = () => {
    if (!quantity || quantity < 10) {
      toast({ title: 'Quantidade inválida', description: 'Mínimo de 10 créditos.', variant: 'destructive' });
      return;
    }
    setRequirementsOpen(true);
  };

  const handleAcceptRequirements = () => {
    setRequirementsOpen(false);
    setPixDialogOpen(true);
  };

  const handlePixConfirm = async (data: PixCustomerFormData) => {
    setPixDialogOpen(false);
    setPixLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('create-lvb-pix', {
        body: {
          creditos: quantity,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          customerDocument: data.customerDocument,
          source: 'creditos_page',
        },
      });
      if (error) throw error;
      if (res?.error) throw new Error(res.error);

      const newPix = {
        orderId: res.order_id,
        pixCodeText: res.pix_code_text,
        amountCents: res.amount_cents,
        creditos: res.creditos,
      };
      setPixState(newPix);
      setShowPixModal(true);
      try {
        localStorage.setItem(PIX_STORAGE_KEY, JSON.stringify({ ...newPix, userId: user?.id }));
      } catch {}
      fetchOrders();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Falha ao gerar PIX', variant: 'destructive' });
    } finally {
      setPixLoading(false);
    }
  };

  const copyPix = () => {
    if (!pixState?.pixCodeText) return;
    navigator.clipboard.writeText(pixState.pixCodeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Código copiado!' });
  };

  const greetingName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'cliente';

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-30%] right-[-10%] w-[700px] h-[700px] rounded-full bg-primary/[0.06] blur-[180px]" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent/[0.05] blur-[160px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 bg-card/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Logo" className="h-8 w-auto" />
            <div className="hidden sm:block">
              <p className="text-sm font-bold font-display text-foreground leading-tight">Painel de Revenda</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Créditos Lovable</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card/60 border border-border/30">
              <Coins className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs text-muted-foreground">Saldo:</span>
              <span className="text-xs font-bold text-foreground">R$ 0,00</span>
            </div>
            <Button variant="ghost" size="sm" className="rounded-xl">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut} className="rounded-xl gap-2 text-xs">
              <LogOut className="h-3.5 w-3.5" /> Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-black font-display text-foreground">
            Olá, {greetingName}!
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie seus pedidos de créditos Lovable.
          </p>
        </div>

        {pixState && !showPixModal && (
          <button
            onClick={() => setShowPixModal(true)}
            className="w-full mb-5 flex items-center justify-between gap-3 p-4 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-amber-500/5 hover:from-amber-500/15 hover:to-amber-500/10 transition-all"
          >
            <div className="flex items-center gap-3 text-left">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <QrCode className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-bold font-display text-foreground">PIX pendente · {formatBRL(pixState.amountCents / 100)}</p>
                <p className="text-[11px] text-muted-foreground">{pixState.creditos} créditos · clique para retomar o pagamento</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold">
              <RotateCcw className="h-3.5 w-3.5" /> Retomar
            </div>
          </button>
        )}

        <Tabs defaultValue="new" className="space-y-5">
          <TabsList className="bg-card/40 border border-border/30 rounded-xl">
            <TabsTrigger value="new" className="rounded-lg text-xs sm:text-sm">Novo Pedido</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs sm:text-sm">Histórico</TabsTrigger>
          </TabsList>

          {/* New Order */}
          <TabsContent value="new">
            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              {/* Order builder */}
              <Card className="rounded-2xl border-border/40 bg-card/50 backdrop-blur-xl">
                <CardContent className="p-5 sm:p-7 space-y-6">
                  <div>
                    <h3 className="text-base font-bold font-display text-foreground">Novo Pedido</h3>
                    <p className="text-xs text-muted-foreground mt-1">Selecione a quantidade de créditos.</p>
                  </div>

                  {/* Quick chips */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Quantidade rápida
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {QUICK_QUANTITIES.map((q) => (
                        <button
                          key={q}
                          onClick={() => handleQuickQty(q)}
                          className={`relative h-11 rounded-xl border text-sm font-bold font-display transition-all duration-200 ${
                            quantity === q
                              ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground border-primary shadow-lg shadow-primary/25'
                              : 'bg-background/50 border-border/40 text-foreground hover:border-primary/50 hover:bg-background/80'
                          }`}
                        >
                          {q}
                          {q === 1000 && (
                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-md bg-amber-500 text-[8px] font-black uppercase tracking-wider text-background">
                              MAIS PEDIDO
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Numeric input */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Quantidade
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-xl"
                        onClick={() => setQuantity((q) => Math.max(10, q - 10))}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min={10}
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(10, parseInt(e.target.value) || 10))}
                        className="h-11 rounded-xl text-center text-base font-bold font-display"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-11 w-11 rounded-xl"
                        onClick={() => setQuantity((q) => q + 10)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Order ref */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Identificador do pedido (opcional)
                    </p>
                    <Input
                      placeholder="Ex: cliente João, pedido #123"
                      value={orderRef}
                      onChange={(e) => setOrderRef(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  {/* Payment method */}
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Método de pagamento
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-12 rounded-xl border-2 border-primary bg-primary/10 flex items-center justify-center gap-2 cursor-pointer">
                        <QrCode className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold font-display text-foreground">PIX Direto</span>
                      </div>
                      <div className="h-12 rounded-xl border border-border/30 bg-muted/20 flex items-center justify-center gap-2 opacity-50 cursor-not-allowed">
                        <Coins className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-muted-foreground">Saldo (em breve)</span>
                      </div>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="rounded-xl border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/5 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Total
                      </p>
                      <p className="text-2xl font-black font-display text-foreground mt-0.5">
                        {formatBRL(total)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">{quantity} créditos</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatBRL(total / quantity)} / crédito
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleCreateOrder}
                    disabled={pixLoading}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold font-display shadow-lg shadow-primary/25 hover:brightness-110 transition-all"
                  >
                    {pixLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando PIX...
                      </>
                    ) : (
                      'Criar Pedido'
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Price table */}
              <Card className="rounded-2xl border-border/40 bg-card/50 backdrop-blur-xl">
                <CardContent className="p-5 sm:p-7 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="h-4 w-4 text-primary" />
                    <h3 className="text-base font-bold font-display text-foreground">Tabela de Preços</h3>
                  </div>
                  <div className="space-y-1.5">
                    {PRICE_TABLE_PACKAGES.map((q) => {
                      const price = prices[q] || DEFAULT_PRICES[q];
                      const isSelected = quantity === q;
                      return (
                        <button
                          key={q}
                          onClick={() => handleQuickQty(q)}
                          className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                            isSelected
                              ? 'border-primary bg-primary/10'
                              : 'border-border/30 bg-background/40 hover:border-primary/40 hover:bg-background/60'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
                              <Coins className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-bold font-display text-foreground">{q} créditos</p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatBRL(price / q)} por crédito
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            {q === 1000 && (
                              <Badge className="text-[9px] bg-amber-500 hover:bg-amber-500 text-background">
                                POPULAR
                              </Badge>
                            )}
                            <span className="text-sm font-black font-display text-foreground">
                              {formatBRL(price)}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-2 flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
                    <ShieldCheck className="h-3 w-3" />
                    Pagamento seguro · Entrega automatizada
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* History */}
          <TabsContent value="history">
            <Card className="rounded-2xl border-border/40 bg-card/50 backdrop-blur-xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Créditos</TableHead>
                    <TableHead className="text-xs">Valor</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Workspace</TableHead>
                    <TableHead className="text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => {
                    const isPending = o.status === 'pending_payment' && o.pix_code_text;
                    return (
                      <TableRow key={o.id} className="border-border/20">
                        <TableCell className="text-xs">
                          {format(new Date(o.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-xs font-bold">{o.creditos}</TableCell>
                        <TableCell className="text-xs">{formatBRL(o.amount_cents / 100)}</TableCell>
                        <TableCell>{statusBadge(o.status)}</TableCell>
                        <TableCell className="text-xs">{o.workspace_name || '—'}</TableCell>
                        <TableCell className="text-right">
                          {isPending ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 rounded-lg gap-1 text-[11px] border-amber-500/40 text-amber-300 hover:bg-amber-500/10"
                              onClick={() => {
                                const newPix = {
                                  orderId: o.id,
                                  pixCodeText: o.pix_code_text,
                                  amountCents: o.amount_cents,
                                  creditos: o.creditos,
                                };
                                setPixState(newPix);
                                setShowPixModal(true);
                                try {
                                  localStorage.setItem(PIX_STORAGE_KEY, JSON.stringify({ ...newPix, userId: user?.id }));
                                } catch {}
                              }}
                            >
                              <RotateCcw className="h-3 w-3" /> Retomar
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {orders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-10">
                        Nenhum pedido ainda. Faça seu primeiro pedido na aba "Novo Pedido".
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <RequirementsDialog
        open={requirementsOpen}
        onOpenChange={setRequirementsOpen}
        onAccept={handleAcceptRequirements}
      />

      {/* PIX customer dialog */}
      <PixCustomerDialog
        open={pixDialogOpen}
        onClose={() => setPixDialogOpen(false)}
        onConfirm={handlePixConfirm}
        loading={pixLoading}
        defaultEmail={user?.email}
      />

      {/* PIX QR modal */}
      <Dialog open={showPixModal} onOpenChange={setShowPixModal}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" /> Pagamento PIX
            </DialogTitle>
            <DialogDescription>
              Escaneie o QR Code ou copie o código abaixo para pagar.
            </DialogDescription>
          </DialogHeader>
          {pixState && (
            <div className="space-y-4 py-2">
              <div className="flex flex-col items-center gap-3">
                <PixQrCode value={pixState.pixCodeText} className="w-56 h-56 rounded-xl border border-border/40" />
                <div className="text-center">
                  <p className="text-xl font-black font-display">{formatBRL(pixState.amountCents / 100)}</p>
                  <p className="text-xs text-muted-foreground">{pixState.creditos} créditos Lovable</p>
                </div>
              </div>
              <div className="rounded-xl border border-border/40 bg-background/50 p-3">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">PIX copia-e-cola</p>
                <p className="text-[10px] font-mono break-all text-foreground/80">{pixState.pixCodeText}</p>
              </div>
              <Button onClick={copyPix} className="w-full rounded-xl gap-2">
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copiado!' : 'Copiar código PIX'}
              </Button>
              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3 animate-pulse" />
                Aguardando confirmação do pagamento...
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
