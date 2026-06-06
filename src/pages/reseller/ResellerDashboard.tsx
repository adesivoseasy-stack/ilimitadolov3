import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ResellerLayout } from '@/components/reseller/ResellerLayout';
import { useResellerStats, useResellerLicenses, useResellerCreateLicense, useUpdateCustomerName } from '@/hooks/useResellerLicenses';
import { useResellerCredits } from '@/hooks/useManagerData';
import { useResellerPricing, useResellerPlanType } from '@/hooks/useResellerPricing';
import { useRenewLicense, useRevokeLicense, useResetDevice, useSetLicenseExpiry, LicenseWithDevice } from '@/hooks/useLicenses';
import { useCreatePixOrder, usePixOrderPolling, PixOrderData } from '@/hooks/usePixOrder';
import { PixCustomerDialog, PixCustomerFormData } from '@/components/reseller/PixCustomerDialog';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import {
  Key, DollarSign, Users, Package, ShoppingCart,
  Download, Plus, Search, MoreHorizontal, RefreshCw,
  Ban, Monitor, CalendarDays, Copy, Eye, Coins, Loader2, QrCode, CheckCircle2,
  Zap, Clock, Flame, Lock, AlertTriangle, UserPen
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import resellerBanner from '@/assets/banner.png';
import keyIcon from '@/assets/key-icon.png';
import { format, parseISO, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import JSZip from 'jszip';
import { LvbCreditsTab } from '@/components/reseller/LvbCreditsTab';
import { PixQrCode } from '@/components/reseller/PixQrCode';

type TabId = 'loja' | 'clientes' | 'estoque' | 'creditos_lovable';

const VALID_TABS: TabId[] = ['loja', 'clientes', 'estoque', 'creditos_lovable'];
const LVB_CREDITS_MAINTENANCE = false;

function getActiveTabFromParams(searchParams: URLSearchParams): TabId {
  const tabParam = searchParams.get('tab');
  if (tabParam === 'creditos_lovable' && LVB_CREDITS_MAINTENANCE) return 'loja';
  return tabParam && VALID_TABS.includes(tabParam as TabId)
    ? (tabParam as TabId)
    : 'loja';
}

export default function ResellerDashboard() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useResellerStats();
  const { data: licenses, isLoading: licensesLoading } = useResellerLicenses();
  const { data: credits } = useResellerCredits(user?.id);
  const { data: planInfo, isLoading: planInfoLoading, isFetching: planInfoFetching } = useResellerPlanType();
  const planType = planInfo?.planType;
  const customKeyPrice = planInfo?.customKeyPrice ?? null;
  const isUnlimited = planType === '997';
  const { data: pricingPlans, isLoading: pricingLoading, isFetching: pricingFetching } = useResellerPricing(planType || '197');
  const createLicense = useResellerCreateLicense();
  const updateCustomerName = useUpdateCustomerName();
  const renewLicense = useRenewLicense();
  const revokeLicense = useRevokeLicense();
  const resetDevice = useResetDevice();
  const setLicenseExpiry = useSetLicenseExpiry();
  const { createOrder, isLoading: pixLoadingHook, error: pixError } = useCreatePixOrder();
  const [loadingQty, setLoadingQty] = useState<number | null>(null);
  const { toast } = useToast();

  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('loja');

  useEffect(() => {
    setActiveTab(getActiveTabFromParams(searchParams));
  }, [searchParams]);
  const downloadExtension = () => {
    const link = document.createElement('a');
    link.href = `/LOV-ULTRA-DIST.zip?v=20260606-0416&t=${Date.now()}`;
    link.download = 'LOV-ULTRA-DIST.zip';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<LicenseWithDevice | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [expiryEdit, setExpiryEdit] = useState<{ id: string; currentExpiry: string } | null>(null);
  const [newExpiryDays, setNewExpiryDays] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newDuration, setNewDuration] = useState('30');
  const [newPrice, setNewPrice] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [editNameLicense, setEditNameLicense] = useState<{ id: string; currentName: string } | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [pixOrder, setPixOrder] = useState<PixOrderData | null>(null);
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const pixStatus = usePixOrderPolling(pixOrder?.order_id || null);
  const [pixCustomerOpen, setPixCustomerOpen] = useState(false);
  const [pendingPixAction, setPendingPixAction] = useState<{ qty: number; promo?: boolean; lifetime?: boolean } | null>(null);

  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const PROMO_QTY = 10;
  const PROMO_TOTAL = 249.90;
  const [promoQty] = useState(PROMO_QTY);
  const [isPromoAvailable, setIsPromoAvailable] = useState(false);
  const [promoTimeLeft, setPromoTimeLeft] = useState('');
  const [isLifetimePromoActive, setIsLifetimePromoActive] = useState(false);
  const [lifetimePromoTimeLeft, setLifetimePromoTimeLeft] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [warningEnabled, setWarningEnabled] = useState(false);
  const [deadlineAt, setDeadlineAt] = useState<string | null>(null);
  const [deadlineCountdown, setDeadlineCountdown] = useState('');

  useEffect(() => {
    // Promoção de Inauguração: 10 chaves por R$249,90
    // Janela: 19/05/2026 16:20 BRT até 20/05/2026 16:20 BRT
    const PROMO_START = new Date('2026-05-19T16:20:00-03:00');
    const PROMO_END = new Date('2026-05-20T16:20:00-03:00');
    const checkPromo = () => {
      const now = new Date();
      const diffMs = PROMO_END.getTime() - now.getTime();
      const isActive = now.getTime() >= PROMO_START.getTime() && diffMs > 0;
      setIsPromoAvailable(isActive);
      if (isActive) {
        const totalSec = Math.floor(diffMs / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        setPromoTimeLeft(h > 0 ? `${h}h${String(m).padStart(2,'0')}m` : `${m}m${String(s).padStart(2,'0')}s`);
      }
    };
    checkPromo();
    const interval = setInterval(checkPromo, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Promoção Relâmpago Chave Vitalícia: R$ 79,90 até 07/06/2026 às 20h
    const LIFETIME_PROMO_END = new Date('2026-06-07T20:00:00-03:00');
    const tick = () => {
      const now = new Date();
      const diffMs = LIFETIME_PROMO_END.getTime() - now.getTime();
      const active = diffMs > 0;
      setIsLifetimePromoActive(active);
      if (active) {
        const totalSec = Math.floor(diffMs / 1000);
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        setLifetimePromoTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    async function fetchWarning() {
      const { data } = await supabase
        .from('system_config')
        .select('key, value')
        .in('key', ['reseller_no_keys_warning_enabled', 'reseller_no_keys_warning_message']);
      if (data) {
        const enabled = data.find(d => d.key === 'reseller_no_keys_warning_enabled');
        const msg = data.find(d => d.key === 'reseller_no_keys_warning_message');
        setWarningEnabled(enabled?.value === 'true');
        setWarningMessage(msg?.value || '');
      }
    }
    fetchWarning();
  }, []);

  // Fetch deadline_at for current reseller
  useEffect(() => {
    async function fetchDeadline() {
      if (!user?.id) return;
      const { data } = await supabase
        .from('reseller_profiles')
        .select('deadline_at')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data?.deadline_at) {
        setDeadlineAt(data.deadline_at as string);
      }
    }
    fetchDeadline();
  }, [user?.id]);

  // Update countdown every second
  useEffect(() => {
    if (!deadlineAt) return;
    const update = () => {
      const now = new Date();
      const deadline = new Date(deadlineAt);
      const diff = deadline.getTime() - now.getTime();
      if (diff <= 0) {
        setDeadlineCountdown('Prazo expirado');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      parts.push(`${minutes}m`);
      parts.push(`${String(seconds).padStart(2, '0')}s`);
      setDeadlineCountdown(parts.join(' '));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadlineAt]);

  const handleBuyPromo = () => {
    setPendingPixAction({ qty: PROMO_QTY, promo: true });
    setPixCustomerOpen(true);
  };

  const handlePixCustomerConfirm = async (customerData: PixCustomerFormData) => {
    if (!pendingPixAction) return;
    const { qty, promo, lifetime } = pendingPixAction;
    setPixCustomerOpen(false);
    setLoadingQty(lifetime ? -2 : promo ? -1 : qty);
    const order = await createOrder(qty, customerData, promo, lifetime);
    setLoadingQty(null);
    if (order) {
      setPixOrder(order);
      if (promo) setIsPromoOpen(false);
      setIsPixModalOpen(true);
    } else {
      toast({
        title: 'Erro',
        description: pixError || 'Não foi possível gerar o PIX.',
        variant: 'destructive',
      });
    }
    setPendingPixAction(null);
  };

  const availableCredits = (credits?.credits_total || 0) - (credits?.credits_used || 0);

  const hasActiveNonTestKeys = useMemo(() => {
    return (licenses || []).some(l => l.status === 'active' && l.max_messages == null);
  }, [licenses]);

   const showDeadlineBanner = deadlineAt && !hasActiveNonTestKeys && !licensesLoading;
   const showNoKeyWarning = !hasActiveNonTestKeys && !licensesLoading;

  const filteredLicenses = licenses?.filter((license) => {
    const matchesSearch =
      license.license_key.toLowerCase().includes(search.toLowerCase()) ||
      license.email.toLowerCase().includes(search.toLowerCase()) ||
      (license.customer_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || license.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Customers derived from licenses
  const customers = (() => {
    if (!licenses) return [];
    const map = new Map<string, { email: string; licenses: number; active: number; devices: number }>();
    licenses.forEach((l) => {
      const existing = map.get(l.email) || { email: l.email, licenses: 0, active: 0, devices: 0 };
      existing.licenses++;
      if (l.status === 'active') existing.active++;
      existing.devices += l.devices?.length || 0;
      map.set(l.email, existing);
    });
    return Array.from(map.values());
  })();

  const handleCreate = async () => {
    if (!newEmail) return;
    const durationValue = parseFloat(newDuration);
    const isTestLicense = newDuration === '0.006944';
    await createLicense.mutateAsync({
      email: newEmail,
      durationDays: durationValue,
      price: newPrice ? parseFloat(newPrice) : undefined,
      notes: newNotes || undefined,
      isTestLicense,
      customerName: newCustomerName || undefined,
    });
    setIsCreateOpen(false);
    setNewEmail('');
    setNewDuration('30');
    setNewPrice('');
    setNewNotes('');
    setNewCustomerName('');
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: 'Copiado!', description: 'Chave copiada para a área de transferência.' });
  };

  const handleSaveCustomerName = async () => {
    if (!editNameLicense) return;
    await updateCustomerName.mutateAsync({ licenseId: editNameLicense.id, customerName: editNameValue });
    setEditNameLicense(null);
    setEditNameValue('');
  };

  const handleSetExpiry = async () => {
    if (!expiryEdit || !newExpiryDays) return;
    const days = parseFloat(newExpiryDays);
    if (isNaN(days) || days <= 0) return;
    const newExpiry = new Date();
    newExpiry.setTime(newExpiry.getTime() + days * 24 * 60 * 60 * 1000);
    await setLicenseExpiry.mutateAsync({ licenseId: expiryEdit.id, newExpiresAt: newExpiry.toISOString() });
    setExpiryEdit(null);
    setNewExpiryDays('');
  };

  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [customQty, setCustomQty] = useState('');
  const isPricingReady = !!planType && !planInfoLoading && !planInfoFetching && !pricingLoading && !pricingFetching;

  const getPromoTotal = (_qty: number): number => {
    return PROMO_TOTAL;
  };

  const getEffectivePrice = (qty: number): number => {
    if (!isPricingReady) return 0;
    // Promoção relâmpago mensal: 1 chave por R$ 34,90 até 04/06/2026 às 20h
    const MONTHLY_PROMO_END = new Date('2026-06-04T20:00:00-03:00').getTime();
    if (qty === 1 && Date.now() < MONTHLY_PROMO_END) {
      return 34.90;
    }
    if (customKeyPrice != null && customKeyPrice > 0) return customKeyPrice;
    if (!pricingPlans || pricingPlans.length === 0) return 30;
    const sorted = [...pricingPlans].sort((a, b) => b.quantity - a.quantity);
    const maxTier = sorted[0];
    if (qty > maxTier.quantity) {
      return parseFloat((maxTier.pricePerKey * 0.95).toFixed(2));
    }
    const tier = sorted.find(t => qty >= t.quantity);
    return tier ? tier.pricePerKey : sorted[sorted.length - 1].pricePerKey;
  };

  const handleBuyKeys = (qty: number) => {
    setPendingPixAction({ qty });
    setPixCustomerOpen(true);
  };

  const handleBuyLifetime = () => {
    setPendingPixAction({ qty: 1, lifetime: true });
    setPixCustomerOpen(true);
  };

  const tabs = [
    { id: 'loja' as TabId, label: 'Loja', icon: ShoppingCart, disabled: false },
    { id: 'clientes' as TabId, label: 'Meus Clientes', icon: Users, disabled: false },
    { id: 'estoque' as TabId, label: 'Meu Estoque', icon: Package, disabled: false },
    { id: 'creditos_lovable' as TabId, label: 'Créditos Lovable', icon: Coins, disabled: LVB_CREDITS_MAINTENANCE },
  ];

  return (
    <ResellerLayout>
      <div className="space-y-6 sm:space-y-8 px-1 sm:px-0 pt-14 lg:pt-0">
        {/* Deadline countdown banner */}
        {showDeadlineBanner && (
          <Alert className="border-destructive/30 bg-destructive/10 rounded-2xl backdrop-blur-sm">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-display text-xs sm:text-sm">
              <span>⚠️ Você precisa ter pelo menos 1 chave ativa para manter seu acesso.</span>
              <span className="font-mono text-xs sm:text-sm bg-destructive/20 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl whitespace-nowrap font-black">{deadlineCountdown}</span>
            </AlertDescription>
          </Alert>
        )}
        {!showDeadlineBanner && showNoKeyWarning && (
          <Alert className="border-destructive/30 bg-destructive/10 rounded-2xl backdrop-blur-sm">
            <Lock className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive font-medium font-display">
              🚨 <strong>Atenção:</strong> Sua conta será bloqueada sem chaves ativas. Adquira pelo menos 1 licença.
            </AlertDescription>
          </Alert>
        )}
        {/* Header & Stats */}
        {(
          <>
            <div className="animate-fade-up">
              <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2 font-display">Painel de Revenda</p>
              <h1 className="text-3xl sm:text-5xl font-black text-gradient-white font-display leading-[1.1]">Revendedor</h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-2">Gerencie seu negócio de revenda</p>
            </div>

            <div className="w-full rounded-2xl overflow-hidden glow-card purple-glow animate-fade-up-delay-1">
              <img src={resellerBanner} alt="Ilimitado Lov Banner" className="w-full h-auto object-contain" />
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-up-delay-2">
              <StatCard
                label="Saldo Disponível"
                value={statsLoading ? '—' : `R$ ${((stats?.revenue || 0)).toFixed(2)}`}
                sub="Lucro acumulado"
                icon={DollarSign}
              />
              <StatCard
                label="Total Vendas"
                value={statsLoading ? '—' : `R$ ${((stats?.revenue || 0)).toFixed(2)}`}
                sub="Faturamento total registrado"
                icon={DollarSign}
              />
              <StatCard
                label="Clientes Ativos"
                value={statsLoading ? '—' : stats?.active || 0}
                sub="Licenças ativas"
                icon={Users}
              />
              <StatCard
                label="Chaves em Estoque"
                value={isUnlimited ? '∞' : `${credits?.credits_used || 0}`}
                sub2={isUnlimited ? '∞' : `${availableCredits}`}
                sub={isUnlimited ? 'Plano Ilimitado' : 'Utilizadas'}
                sub2Label={isUnlimited ? 'Sem limite' : 'Disponíveis para venda'}
                icon={Key}
              />
            </div>
          </>
        )}

        {/* Tabs */}
        <div className="flex gap-1 glass-card rounded-2xl p-1.5 w-full sm:w-fit overflow-x-auto scrollbar-none animate-fade-up-delay-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setActiveTab(tab.id)}
                disabled={tab.disabled}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 font-display whitespace-nowrap flex-1 sm:flex-none justify-center ${
                  tab.disabled
                    ? 'opacity-50 cursor-not-allowed text-muted-foreground'
                    : activeTab === tab.id
                    ? 'bg-gradient text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]'
                }`}
              >
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
                {tab.disabled && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold text-yellow-500">
                    <AlertTriangle className="h-3 w-3" />
                    Manutenção
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'loja' && (
          <div className="space-y-6">
            {/* Promo Banner - always visible */}
            <div
              className={`relative overflow-hidden rounded-2xl border-2 p-5 transition-all duration-300 ${
                isPromoAvailable
                  ? 'border-orange-500/50 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-yellow-500/10 cursor-pointer hover:border-orange-500/80'
                  : 'border-border/50 bg-card/30'
              }`}
              onClick={() => isPromoAvailable && setIsPromoOpen(true)}
            >
              {!isPromoAvailable && (
                <div className="absolute inset-0 z-10 bg-background/50 backdrop-blur-[2px] rounded-2xl flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <div className="h-12 w-12 rounded-full bg-muted/80 flex items-center justify-center">
                      <Lock className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-medium">Promoção encerrada</span>
                  </div>
                </div>
              )}
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl" />
              <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`h-10 w-10 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30 shrink-0 ${isPromoAvailable ? 'animate-pulse' : 'grayscale-[40%]'}`}>
                    <Flame className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm sm:text-lg font-bold text-foreground">🎉 PROMOÇÃO DE INAUGURAÇÃO</h3>
                      <span className={`text-white text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${isPromoAvailable ? 'bg-gradient-to-r from-orange-500 to-red-500 animate-pulse' : 'bg-muted-foreground/50'}`}>
                        {isPromoAvailable ? '24H APENAS' : 'ENCERRADA'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                      <span className="font-bold text-orange-500 text-sm sm:text-base">10 chaves por R$ 249,90</span> — oferta de inauguração, válida por 24h!
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end sm:self-auto">
                  {isPromoAvailable ? (
                    <>
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-orange-500">
                          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          <span className="font-bold text-base sm:text-lg">{promoTimeLeft}</span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] text-muted-foreground">restantes</span>
                      </div>
                      <Button size="sm" className="rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90 shadow-lg shadow-orange-500/20 text-xs sm:text-sm">
                        <Zap className="mr-1.5 h-3.5 w-3.5 sm:mr-2 sm:h-4 sm:w-4" />
                        Aproveitar
                      </Button>
                    </>
                  ) : (
                    <div className="text-center">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span className="font-medium text-sm">Encerrada</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {isUnlimited ? (
              /* Unlimited plan */
              <div className="relative group">
                <div
                  className="absolute -inset-2 rounded-[2rem] opacity-30 group-hover:opacity-50 blur-xl transition-opacity duration-500 animate-glow-rotate"
                  style={{
                    background: 'linear-gradient(135deg, hsl(224 76% 48%), hsl(200 80% 55%), hsl(260 70% 60%))',
                    backgroundSize: '400% 400%',
                  }}
                />
                <div className="relative p-8 rounded-3xl bg-card border border-border/50 text-center space-y-3">
                  <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto">
                    <img src={keyIcon} alt="Chave" className="h-[52px] w-[52px] object-contain" />
                  </div>
                  <h2 className="text-xl font-semibold text-foreground">Plano <span className="text-gradient">Ilimitado</span> (R$ 997)</h2>
                  <p className="text-sm text-muted-foreground">
                    Crie quantas chaves quiser sem custo adicional por chave.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Vá até a aba <span className="font-medium text-foreground">Meu Estoque</span> para gerar novas chaves.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Key Tiers */}
                <div>
                  <h2 className="text-2xl font-black text-foreground flex items-center gap-3 mb-1 font-display">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    Comprar <span className="text-gradient">Chaves</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mb-5 font-display">
                    {isPricingReady
                      ? `Plano R$ ${planType}${customKeyPrice ? ` — R$ ${customKeyPrice.toFixed(2)}/key` : ' — Acima de 3 chaves, desconto fixo de 5%.'}`
                      : 'Carregando preços do seu plano...'}
                  </p>

                  <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {(isPricingReady ? (pricingPlans || []) : []).map((tier, index) => {
                      const effectivePrice = customKeyPrice != null && customKeyPrice > 0 ? customKeyPrice : tier.pricePerKey;
                      const total = tier.quantity * effectivePrice;
                      const basePrice = customKeyPrice != null && customKeyPrice > 0 ? customKeyPrice : (pricingPlans?.[0]?.pricePerKey || effectivePrice);
                      const discount = basePrice > effectivePrice ? Math.round((1 - effectivePrice / basePrice) * 100) : 0;
                      const isSelected = selectedTier === index;
                      const isBestSeller = tier.quantity === 2;
                      return (
                        <div
                          key={tier.quantity}
                          className="relative"
                        >
                          {/* Fire glow behind best seller */}
                          {isBestSeller && (
                            <div
                              className="absolute -inset-[2px] rounded-[1.1rem] z-0 animate-pulse"
                              style={{
                                background: 'linear-gradient(135deg, #f97316, #eab308, #f97316, #ef4444)',
                                backgroundSize: '300% 300%',
                                animation: 'fire-glow 3s ease infinite',
                              }}
                            />
                          )}
                          <div
                            className={`group relative p-5 rounded-2xl backdrop-blur-sm border transition-all duration-300 cursor-pointer hover:shadow-xl ${
                              isBestSeller
                                ? 'bg-card border-transparent hover:shadow-orange-500/20 z-10'
                                : isSelected
                                  ? 'ring-2 ring-primary border-primary/50 bg-card/50 hover:shadow-primary/5'
                                  : 'border-border/50 hover:border-primary/40 bg-card/50 hover:shadow-primary/5'
                            }`}
                            onClick={() => setSelectedTier(index)}
                          >
                            <div className="absolute inset-0 rounded-2xl bg-gradient-subtle opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                            {isBestSeller && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                                <span className="bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 text-black text-[10px] font-extrabold px-3 py-1 rounded-full shadow-lg shadow-orange-500/30 flex items-center gap-1 whitespace-nowrap">
                                  <Flame className="h-3 w-3" />
                                  MAIS VENDIDA
                                </span>
                              </div>
                            )}
                            {discount > 0 && !isBestSeller && (
                              <div className="absolute -top-2 right-3 z-10">
                                <span className="bg-gradient text-primary-foreground text-[10px] font-bold px-2.5 py-1 rounded-full">
                                  -{discount}%
                                </span>
                              </div>
                            )}
                            <div className="relative space-y-3 text-center">
                              <div className="h-12 w-12 rounded-xl flex items-center justify-center mx-auto">
                                <img src={keyIcon} alt="Chave" className="h-[44px] w-[44px] object-contain" />
                              </div>
                              <div>
                                <h3 className={`text-3xl font-bold ${isBestSeller ? 'bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent' : 'text-gradient'}`}>{tier.quantity}</h3>
                                <p className="text-xs text-muted-foreground">{tier.quantity === 1 ? 'chave' : 'chaves'}</p>
                              </div>
                              <div className={`rounded-xl p-3 ${isBestSeller ? 'bg-gradient-to-r from-orange-500/15 to-yellow-500/15 border border-orange-500/20' : 'bg-secondary/50'}`}>
                                <span className={`text-xl font-bold ${isBestSeller ? 'text-orange-400' : 'text-primary'}`}>R$ {total.toFixed(2)}</span>
                                <p className="text-[11px] text-muted-foreground">total por {tier.quantity === 1 ? 'chave' : `${tier.quantity} chaves`}</p>
                              </div>
                              <p className="text-sm font-semibold text-foreground">R$ {effectivePrice.toFixed(2)} por chave/mês</p>
                              <Button
                                className={`w-full rounded-xl ${
                                  isBestSeller
                                    ? 'bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-bold hover:opacity-90 shadow-lg shadow-orange-500/20'
                                    : isSelected
                                      ? 'bg-gradient text-primary-foreground hover:opacity-90'
                                      : ''
                                }`}
                                variant={isBestSeller || isSelected ? 'default' : 'outline'}
                                size="sm"
                                disabled={loadingQty !== null}
                                onClick={(e) => { e.stopPropagation(); handleBuyKeys(tier.quantity); }}
                              >
                                {loadingQty === tier.quantity ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isBestSeller ? <Zap className="mr-2 h-4 w-4" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                                {loadingQty === tier.quantity ? 'Gerando...' : isBestSeller ? 'Comprar Agora' : 'Comprar'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {!isPricingReady && (
                      <div className="col-span-full rounded-2xl border border-border/50 bg-card/40 p-6 text-sm text-muted-foreground font-display">
                        Carregando valores atualizados...
                      </div>
                    )}
                  </div>
                </div>

                {/* Lifetime Key */}
                <div className="relative">
                  <div
                    className="absolute -inset-[2px] rounded-[1.3rem] z-0 animate-pulse opacity-80"
                    style={{
                      background: 'linear-gradient(135deg, #a855f7, #ec4899, #8b5cf6, #6366f1)',
                      backgroundSize: '300% 300%',
                      animation: 'fire-glow 4s ease infinite',
                    }}
                  />
                  <div className="relative p-6 sm:p-7 rounded-3xl bg-card border border-transparent z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center shrink-0">
                        <img src={keyIcon} alt="Chave Vitalícia" className="h-[44px] w-[44px] object-contain" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {isLifetimePromoActive ? (
                            <span className="bg-gradient-to-r from-pink-500 to-red-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                              🔥 Promo Relâmpago
                            </span>
                          ) : (
                            <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                              Exclusivo
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Validade ∞</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-foreground font-display">
                          Chave <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Vitalícia</span>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-md">
                          1 chave com validade ilimitada para o cliente final. Venda como produto premium.
                        </p>
                        {isLifetimePromoActive && (
                          <p className="text-xs font-bold text-pink-300 mt-2 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            Até amanhã 20h • Termina em <span className="font-mono text-pink-200">{lifetimePromoTimeLeft}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
                      <div className="text-right">
                        {isLifetimePromoActive ? (
                          <>
                            <div className="flex items-baseline gap-2 justify-end">
                              <span className="text-sm text-muted-foreground line-through">R$ 147,90</span>
                              <span className="text-3xl font-black bg-gradient-to-r from-pink-400 to-red-400 bg-clip-text text-transparent">R$ 79,90</span>
                            </div>
                            <p className="text-[11px] text-pink-300 font-bold">economize R$ 68,00</p>
                          </>
                        ) : (
                          <>
                            <span className="text-3xl font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">R$ 147,90</span>
                            <p className="text-[11px] text-muted-foreground">pagamento único</p>
                          </>
                        )}
                      </div>
                      <Button
                        disabled={loadingQty !== null}
                        onClick={handleBuyLifetime}
                        className="group relative overflow-hidden rounded-xl bg-[linear-gradient(110deg,#a855f7,45%,#ec4899,55%,#a855f7)] bg-[length:200%_100%] text-white font-bold shadow-lg shadow-purple-500/30 w-full sm:w-auto transition-all duration-300 hover:scale-[1.04] hover:shadow-pink-500/50 active:scale-95 animate-[gradient-x_3s_ease_infinite]"
                      >
                        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:animate-[shimmer_1.2s_ease-in-out]" />
                        {loadingQty === -2 ? <Loader2 className="relative mr-2 h-4 w-4 animate-spin" /> : <Zap className="relative mr-2 h-4 w-4 animate-pulse" />}
                        <span className="relative">{loadingQty === -2 ? 'Gerando PIX...' : 'Comprar Vitalícia'}</span>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Custom quantity */}
                <div className="p-6 rounded-2xl glass-card">
                    <h3 className="font-bold text-foreground mb-3 flex items-center gap-2 font-display">
                      <Plus className="h-4 w-4 text-primary" />
                      Quantidade personalizada
                    </h3>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">Quantidade de chaves</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="Ex: 20"
                          value={customQty}
                          onChange={(e) => setCustomQty(e.target.value)}
                          className="rounded-xl"
                        />
                      </div>
                      {customQty && parseInt(customQty) > 0 && (
                        <div className="text-sm space-y-0.5">
                          <p className="text-muted-foreground">
                            Preço: <span className="font-semibold text-foreground">{isPricingReady ? `R$ ${getEffectivePrice(parseInt(customQty)).toFixed(2)}/chave` : 'Carregando...'}</span>
                          </p>
                          <p className="text-muted-foreground">
                            Total: <span className="font-bold text-gradient">{isPricingReady ? `R$ ${(parseInt(customQty) * getEffectivePrice(parseInt(customQty))).toFixed(2)}` : 'Carregando...'}</span>
                          </p>
                        </div>
                      )}
                      <Button
                        disabled={!isPricingReady || !customQty || parseInt(customQty) <= 0 || loadingQty !== null}
                        onClick={() => handleBuyKeys(parseInt(customQty))}
                        className="rounded-xl bg-gradient text-primary-foreground hover:opacity-90"
                      >
                        {loadingQty === parseInt(customQty || '0') ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                        {loadingQty === parseInt(customQty || '0') ? 'Gerando PIX...' : 'Comprar via PIX'}
                      </Button>
                    </div>
                </div>
              </>
            )}

          </div>
        )}

        {activeTab === 'clientes' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-foreground font-display">Meus <span className="text-gradient">Clientes</span></h2>
              <span className="text-[11px] font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-xl border border-primary/10 font-display">{customers.length}</span>
            </div>
            {licensesLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
            ) : customers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente encontrado</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {customers.map((customer) => (
                  <div key={customer.email} className="glass-card-hover rounded-2xl p-5 group">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient flex items-center justify-center shrink-0 shadow-lg shadow-primary/15">
                          <span className="text-xs font-bold text-primary-foreground font-display">{customer.email.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-[13px] truncate font-semibold font-display">{customer.email}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground pl-12 font-display">
                        <span className="font-bold text-foreground">{customer.licenses}</span> licença(s)
                        <span className="text-success font-bold">{customer.active}</span> ativa(s)
                        <span className="flex items-center gap-1"><Monitor className="h-3 w-3" />{customer.devices}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'estoque' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-foreground font-display">Meu <span className="text-gradient">Estoque</span></h2>
                <div className="flex items-center gap-1.5 mt-2 text-xs font-display">
                  <Coins className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className={availableCredits <= 0 ? 'text-destructive font-bold' : 'text-success font-bold'}>
                    {availableCredits} disponíveis
                  </span>
                  <span className="text-muted-foreground">/ {credits?.credits_total || 0} total</span>
                </div>
              </div>
              <Button onClick={() => setIsCreateOpen(true)} disabled={availableCredits <= 0} className="bg-gradient shadow-lg shadow-primary/20 font-display">
                <Plus className="mr-2 h-4 w-4" />Nova Chave
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Buscar por chave, email ou cliente..." className="pl-9 bg-card/40 border-border/30 focus:border-primary/30" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className="rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm px-3 py-2 text-sm font-display" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Todos</option>
                <option value="active">Ativas</option>
                <option value="expired">Expiradas</option>
                <option value="revoked">Revogadas</option>
              </select>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block glass-card rounded-2xl overflow-x-auto scrollbar-none">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/20 hover:bg-transparent">
                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Chave</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Cliente</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Email</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Status</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Device</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Expira</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {licensesLoading ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
                  ) : filteredLicenses?.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma chave encontrada</TableCell></TableRow>
                  ) : (
                    filteredLicenses?.map((license) => (
                      <TableRow key={license.id}>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <code className="text-[11px] sm:text-sm font-mono truncate max-w-[100px] sm:max-w-none">{license.license_key}</code>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyKey(license.license_key)}>
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{license.customer_name || <span className="text-muted-foreground italic">—</span>}</span>
                        </TableCell>
                        <TableCell>{license.email}</TableCell>
                        <TableCell><StatusBadge status={license.status} /></TableCell>
                        <TableCell>
                          {license.devices?.length > 0 ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Monitor className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate max-w-[100px]">{license.devices[0].device_name || 'Vinculado'}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Não vinculado</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ExpiryInfo expiresAt={license.expires_at} durationHours={license.duration_hours} firstActivatedAt={license.first_activated_at} />
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setSelectedLicense(license); setIsDetailsOpen(true); }}>
                                <Eye className="mr-2 h-4 w-4" />Ver detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setEditNameLicense({ id: license.id, currentName: license.customer_name || '' }); setEditNameValue(license.customer_name || ''); }}>
                                <UserPen className="mr-2 h-4 w-4" />Editar nome do cliente
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {license.status === 'expired' && (
                                <DropdownMenuItem onClick={() => renewLicense.mutate({ licenseId: license.id, durationDays: 30 })}>
                                  <RefreshCw className="mr-2 h-4 w-4" />Renovar +30 dias (1 crédito)
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setExpiryEdit({ id: license.id, currentExpiry: license.expires_at })}>
                                <CalendarDays className="mr-2 h-4 w-4" />Alterar expiração
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => resetDevice.mutate(license.id)}>
                                <Monitor className="mr-2 h-4 w-4" />Resetar dispositivo
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive" onClick={() => setRevokeConfirm(license.id)}>
                                <Ban className="mr-2 h-4 w-4" />Revogar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {licensesLoading ? (
                <div className="glass-card rounded-2xl p-4 text-center text-sm text-muted-foreground">Carregando...</div>
              ) : filteredLicenses?.length === 0 ? (
                <div className="glass-card rounded-2xl p-4 text-center text-sm text-muted-foreground">Nenhuma chave encontrada</div>
              ) : (
                filteredLicenses?.map((license) => (
                  <div key={license.id} className="glass-card rounded-2xl p-4 space-y-3 overflow-hidden">
                    <div className="flex items-start justify-between gap-3 min-w-0">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-display mb-1">Chave</p>
                        <code className="block text-[11px] font-mono break-all text-foreground">{license.license_key}</code>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => handleCopyKey(license.license_key)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs min-w-0">
                      <div className="min-w-0">
                        <p className="text-muted-foreground mb-1">Cliente</p>
                        <p className="truncate text-foreground">{license.customer_name || '—'}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-muted-foreground mb-1">Status</p>
                        <StatusBadge status={license.status} />
                      </div>
                      <div className="min-w-0 col-span-2">
                        <p className="text-muted-foreground mb-1">Email</p>
                        <p className="truncate text-foreground">{license.email}</p>
                      </div>
                      <div className="min-w-0">
                        <p className="text-muted-foreground mb-1">Device</p>
                        {license.devices?.length > 0 ? (
                          <div className="flex items-center gap-1 text-foreground min-w-0">
                            <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{license.devices[0].device_name || 'Vinculado'}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Não vinculado</span>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground mb-1">Expira</p>
                        <ExpiryInfo expiresAt={license.expires_at} durationHours={license.duration_hours} firstActivatedAt={license.first_activated_at} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => { setSelectedLicense(license); setIsDetailsOpen(true); }}>
                        <Eye className="mr-1.5 h-3.5 w-3.5" />Detalhes
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => { setEditNameLicense({ id: license.id, currentName: license.customer_name || '' }); setEditNameValue(license.customer_name || ''); }}>
                        <UserPen className="mr-1.5 h-3.5 w-3.5" />Nome
                      </Button>
                      {license.status === 'expired' && (
                        <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => renewLicense.mutate({ licenseId: license.id, durationDays: 30 })}>
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Renovar
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => setExpiryEdit({ id: license.id, currentExpiry: license.expires_at })}>
                        <CalendarDays className="mr-1.5 h-3.5 w-3.5" />Expiração
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={() => resetDevice.mutate(license.id)}>
                        <Monitor className="mr-1.5 h-3.5 w-3.5" />Resetar
                      </Button>
                      <Button variant="outline" size="sm" className="rounded-xl text-xs text-destructive" onClick={() => setRevokeConfirm(license.id)}>
                        <Ban className="mr-1.5 h-3.5 w-3.5" />Revogar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'creditos_lovable' && <LvbCreditsTab />}

        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Chave</DialogTitle>
              <DialogDescription>Gere uma nova chave de licença</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customerName2">Nome do cliente</Label>
                <Input id="customerName2" placeholder="Ex: João Silva" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email do cliente</Label>
                <Input id="email" type="email" placeholder="cliente@exemplo.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Duração</Label>
                <div className="rounded-xl border border-border/20 bg-background/20 px-4 py-3 text-sm">
                  30 dias <span className="text-xs text-muted-foreground">(fixo — teste continua separado e licença comum não usa mais 1 ano)</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Preço (R$)</Label>
                <Input id="price" type="number" step="0.01" placeholder="0.00" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" placeholder="Notas..." value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createLicense.isPending}>
                {createLicense.isPending ? 'Criando...' : 'Criar Chave'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Detalhes da Chave</DialogTitle></DialogHeader>
            {selectedLicense && (
              <div className="space-y-4">
                <div><Label className="text-muted-foreground">Chave</Label><p className="font-mono text-sm">{selectedLicense.license_key}</p></div>
                <div><Label className="text-muted-foreground">Cliente</Label><p>{selectedLicense.customer_name || '—'}</p></div>
                <div><Label className="text-muted-foreground">Email</Label><p>{selectedLicense.email}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><p><StatusBadge status={selectedLicense.status} /></p></div>
                <div><Label className="text-muted-foreground">Criada em</Label><p className="text-sm">{format(parseISO(selectedLicense.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p></div>
                <div><Label className="text-muted-foreground">Expira em</Label><p className="text-sm">{format(parseISO(selectedLicense.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p></div>
                {selectedLicense.notes && <div><Label className="text-muted-foreground">Observações</Label><p className="text-sm">{selectedLicense.notes}</p></div>}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Customer Name Dialog */}
        <Dialog open={!!editNameLicense} onOpenChange={(open) => { if (!open) { setEditNameLicense(null); setEditNameValue(''); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Editar Nome do Cliente</DialogTitle>
              <DialogDescription>Defina um nome para identificar o cliente desta licença</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input placeholder="Nome do cliente..." value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditNameLicense(null); setEditNameValue(''); }}>Cancelar</Button>
              <Button onClick={handleSaveCustomerName} disabled={updateCustomerName.isPending}>
                {updateCustomerName.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Expiry Edit Dialog */}
        <Dialog open={!!expiryEdit} onOpenChange={(open) => { if (!open) { setExpiryEdit(null); setNewExpiryDays(''); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Alterar Expiração</DialogTitle>
              <DialogDescription>Defina uma nova data de expiração</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-4 gap-2">
                {[{ label: '7d', v: '7' }, { label: '30d', v: '30' }, { label: '90d', v: '90' }, { label: '365d', v: '365' }].map(o => (
                  <Button key={o.v} variant={newExpiryDays === o.v ? 'default' : 'outline'} size="sm" onClick={() => setNewExpiryDays(o.v)}>{o.label}</Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" placeholder="Dias..." value={!['7', '30', '90', '365'].includes(newExpiryDays) ? newExpiryDays : ''} onChange={(e) => setNewExpiryDays(e.target.value)} />
                <span className="text-xs text-muted-foreground">dias</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setExpiryEdit(null); setNewExpiryDays(''); }}>Cancelar</Button>
              <Button onClick={handleSetExpiry} disabled={!newExpiryDays}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revoke Confirm */}
        <AlertDialog open={!!revokeConfirm} onOpenChange={(open) => !open && setRevokeConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revogar chave?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (revokeConfirm) revokeLicense.mutate(revokeConfirm); setRevokeConfirm(null); }}>Revogar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Promo Popup */}
        <Dialog open={isPromoOpen} onOpenChange={setIsPromoOpen}>
          <DialogContent className="max-w-md border-orange-500/30 bg-gradient-to-b from-background to-orange-500/5">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Flame className="h-6 w-6 text-orange-500" />
                🎉 Promoção de Inauguração
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Pacote especial: <span className="font-bold text-orange-500">10 chaves por R$ 249,90</span> — só nas próximas 24h!
              </p>
            </DialogHeader>
            <div className="space-y-5 py-4">
              <div className="text-center space-y-2">
                <Label className="text-sm text-muted-foreground">Pacote fixo</Label>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-5xl font-bold text-foreground">{PROMO_QTY}</span>
                  <span className="text-lg text-muted-foreground">chaves</span>
                </div>
                <p className="text-xs text-muted-foreground">Equivalente a R$ 24,99 por chave</p>
              </div>
              <div className="rounded-2xl bg-card border border-border/50 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preço por chave</span>
                  <span className="font-semibold text-orange-500">R$ 24,99</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Quantidade</span>
                  <span className="font-semibold">{PROMO_QTY}</span>
                </div>
                <div className="border-t border-border/50 pt-2 flex justify-between">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="text-xl font-bold text-orange-500">R$ {PROMO_TOTAL.toFixed(2)}</span>
                </div>
              </div>
              <Button
                className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white hover:opacity-90 shadow-lg shadow-orange-500/20 h-12 text-base font-semibold"
                disabled={loadingQty === -1}
                onClick={handleBuyPromo}
              >
                {loadingQty === -1 ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Gerando PIX...</>
                ) : (
                  <><Zap className="mr-2 h-5 w-5" />Pagar R$ {getPromoTotal(promoQty).toFixed(2)} via PIX</>
                )}
              </Button>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3 text-orange-500" />
                <span>Oferta expira em <span className="font-semibold text-orange-500">{promoTimeLeft}</span></span>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Customer Data Dialog for PIX */}
        <PixCustomerDialog
          open={pixCustomerOpen}
          onClose={() => { setPixCustomerOpen(false); setPendingPixAction(null); }}
          onConfirm={handlePixCustomerConfirm}
          loading={pixLoadingHook}
          defaultEmail={user?.email || ''}
        />

        {/* PIX Payment Modal */}
        <Dialog open={isPixModalOpen} onOpenChange={(open) => {
          if (!open && pixStatus !== 'pending') {
            setIsPixModalOpen(false);
            setPixOrder(null);
          } else if (!open) {
            setIsPixModalOpen(false);
            setPixOrder(null);
          }
        }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5 text-primary" />
                Pagamento PIX
              </DialogTitle>
              <DialogDescription>
                Escaneie o QR Code ou copie o código PIX para pagar
              </DialogDescription>
            </DialogHeader>

            {pixStatus === 'paid' ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">Pagamento Confirmado!</h3>
                <p className="text-sm text-muted-foreground text-center">
                  {pixOrder?.quantity} crédito(s) foram adicionados à sua conta.
                </p>
                <Button onClick={() => { setIsPixModalOpen(false); setPixOrder(null); }} className="bg-gradient text-primary-foreground">
                  Fechar
                </Button>
              </div>
            ) : pixOrder ? (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{pixOrder.quantity}</span> chave(s) × R$ {pixOrder.price_per_key.toFixed(2)}
                  </p>
                  <p className="text-2xl font-bold text-gradient">
                    R$ {(pixOrder.amount_cents / 100).toFixed(2)}
                  </p>
                </div>

                {(pixOrder.qr_code_image_url || pixOrder.qr_code_text) && (
                  <div className="flex justify-center">
                    <PixQrCode
                      value={pixOrder.qr_code_text}
                      imageUrl={pixOrder.qr_code_image_url}
                      alt="QR Code PIX"
                      className="w-48 h-48 rounded-lg border border-border"
                    />
                  </div>
                )}

                {pixOrder.qr_code_text && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Código PIX (Copia e Cola)</Label>
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={pixOrder.qr_code_text}
                        className="text-xs font-mono"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          navigator.clipboard.writeText(pixOrder.qr_code_text);
                          toast({ title: 'Copiado!', description: 'Código PIX copiado.' });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Aguardando pagamento...</span>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </ResellerLayout>
  );
}

function StatCard({ label, value, sub, sub2, sub2Label, icon: Icon }: {
  label: string; value: any; sub: string; icon: any; sub2?: string; sub2Label?: string;
}) {
  return (
    <div className="glass-card-hover rounded-2xl p-3.5 sm:p-5 relative overflow-hidden group">
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-primary opacity-40 group-hover:opacity-70 transition-opacity" />
      <div className="flex items-center justify-between mb-2.5 sm:mb-4">
        <span className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] font-display truncate">{label}</span>
        <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-primary/[0.06] group-hover:bg-primary/10 transition-colors">
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
        </div>
      </div>
      <p className="text-xl sm:text-3xl font-black text-foreground tabular-nums font-display truncate">{value}</p>
      <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 sm:mt-1.5 font-display truncate">{sub}</p>
      {sub2 && (
        <>
          <p className="text-lg sm:text-xl font-black text-foreground tabular-nums mt-1.5 sm:mt-2 font-display">{sub2}</p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground font-display truncate">{sub2Label}</p>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: { label: 'ATIVA', className: 'bg-success/15 text-success border-success/20' },
    expired: { label: 'EXP', className: 'bg-warning/15 text-warning border-warning/20' },
    revoked: { label: 'REV', className: 'bg-destructive/15 text-destructive border-destructive/20' },
  }[status] || { label: status, className: 'bg-muted text-muted-foreground border-border' };
  return <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black font-display ${config.className}`}>{config.label}</span>;
}

function ExpiryInfo({ expiresAt, durationHours, firstActivatedAt }: { expiresAt: string; durationHours?: number | null; firstActivatedAt?: string | null }) {
  if (durationHours && !firstActivatedAt) {
    const totalMinutes = durationHours * 60;
    if (totalMinutes < 60) return <span className="text-xs text-muted-foreground">⏳ {Math.round(totalMinutes)}min (aguardando)</span>;
    return <span className="text-xs text-muted-foreground">⏳ {Math.round(durationHours)}h (aguardando)</span>;
  }
  const now = new Date();
  const expiry = parseISO(expiresAt);
  if (expiry < now) return <span className="text-xs text-destructive">Expirado</span>;
  const days = differenceInDays(expiry, now);
  if (days > 365) return <span className="text-xs text-muted-foreground">∞</span>;
  if (days > 0) return <span className="text-xs text-muted-foreground">{days}d</span>;
  const hours = differenceInHours(expiry, now);
  if (hours > 0) return <span className="text-xs text-warning">{hours}h</span>;
  const minutes = differenceInMinutes(expiry, now);
  return <span className="text-xs text-destructive">{minutes}min</span>;
}
