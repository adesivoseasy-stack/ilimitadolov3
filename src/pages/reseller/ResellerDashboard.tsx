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
import bannerMp4 from '@/assets/lov-banner.mp4.asset.json';
import bannerWebm from '@/assets/lov-banner.webm.asset.json';
import bannerPoster from '@/assets/lov-banner-poster.jpg.asset.json';
import keyIcon from '@/assets/key-icon.webp';
import comboBannerAsset from '@/assets/combo-300-creditos-pro-lite.png.asset.json';
import comboChampionBannerAsset from '@/assets/combo-copa-brasil.png.asset.json';
import comboAccountBanner from '@/assets/combo-conta-lovable.webp';
import manusCreditsBannerAsset from '@/assets/manus-ai-1000-creditos.png.asset.json';
import geminiProBanner from '@/assets/gemini-pro-18-meses.webp';
import seedanceBannerAsset from '@/assets/seedance-8500k-creditos.png.asset.json';
import capcutProBannerAsset from '@/assets/capcut-pro-30d.png.asset.json';
import lovableAccountBannerAsset from '@/assets/conta-lovable-pro-105-creditos.png.asset.json';
import { format, parseISO, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import extensionZipAsset from '@/assets/lov3.4.zip.asset.json';
import JSZip from 'jszip';
import { LvbCreditsTab } from '@/components/reseller/LvbCreditsTab';
import { PixQrCode } from '@/components/reseller/PixQrCode';
import { CommunityDiscountBanner } from '@/components/reseller/CommunityDiscountBanner';
import { PromocoesWidget } from '@/components/reseller/PromocoesWidget';

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
    link.href = `${extensionZipAsset.url}?t=${Date.now()}`;
    link.download = 'lov3.4.zip';
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
  const [pendingPixAction, setPendingPixAction] = useState<{ qty: number; promo?: boolean; lifetime?: boolean; lifetimeBulk?: boolean; combo?: boolean; comboChampion?: boolean; comboAccount?: boolean; manusCredits?: boolean; geminiPro?: boolean; seedanceAccount?: boolean; capcutPro?: boolean; lovableAccount?: boolean; planBasico?: boolean; planPlus?: boolean; planPro?: boolean; planFundador?: boolean } | null>(null);
  const [comboRequirementsOpen, setComboRequirementsOpen] = useState(false);
  const [comboAccepted, setComboAccepted] = useState(false);
  const [lastOrderWasCombo, setLastOrderWasCombo] = useState(false);
  const [comboChampionRequirementsOpen, setComboChampionRequirementsOpen] = useState(false);
  const [comboChampionAccepted, setComboChampionAccepted] = useState(false);
  const [lastOrderWasComboChampion, setLastOrderWasComboChampion] = useState(false);
  const [comboAccountRequirementsOpen, setComboAccountRequirementsOpen] = useState(false);
  const [comboAccountAccepted, setComboAccountAccepted] = useState(false);
  const [lastOrderWasComboAccount, setLastOrderWasComboAccount] = useState(false);
  const [manusCreditsRequirementsOpen, setManusCreditsRequirementsOpen] = useState(false);
  const [manusCreditsAccepted, setManusCreditsAccepted] = useState(false);
  const [lastOrderWasManusCredits, setLastOrderWasManusCredits] = useState(false);
  const [geminiProRequirementsOpen, setGeminiProRequirementsOpen] = useState(false);
  const [geminiProAccepted, setGeminiProAccepted] = useState(false);
  const [lastOrderWasGeminiPro, setLastOrderWasGeminiPro] = useState(false);
  const [seedanceRequirementsOpen, setSeedanceRequirementsOpen] = useState(false);
  const [seedanceAccepted, setSeedanceAccepted] = useState(false);
  const [lastOrderWasSeedance, setLastOrderWasSeedance] = useState(false);
  const [capcutProRequirementsOpen, setCapcutProRequirementsOpen] = useState(false);
  const [capcutProAccepted, setCapcutProAccepted] = useState(false);
  const [lastOrderWasCapcutPro, setLastOrderWasCapcutPro] = useState(false);
  const [lovableAccountRequirementsOpen, setLovableAccountRequirementsOpen] = useState(false);
  const [lovableAccountAccepted, setLovableAccountAccepted] = useState(false);
  const [lastOrderWasLovableAccount, setLastOrderWasLovableAccount] = useState(false);

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

  const [activePromos, setActivePromos] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('promotions').select('*').eq('is_active', true).then(({data}) => {
      setActivePromos(data || []);
    });
  }, []);

  const vitaliciaPromo = activePromos.find(p => p.type === 'vitalicia' && (!p.expires_at || new Date(p.expires_at) > new Date()));
  const bulkPromo = activePromos.find(p => p.type === 'pacote' && p.quantity === 10 && (!p.expires_at || new Date(p.expires_at) > new Date()));

  useEffect(() => {
    if (!vitaliciaPromo) {
      setIsLifetimePromoActive(false);
      return;
    }
    if (!vitaliciaPromo.expires_at) {
      setIsLifetimePromoActive(true);
      setLifetimePromoTimeLeft('');
      return;
    }
    const end = new Date(vitaliciaPromo.expires_at).getTime();
    const tick = () => {
      const diffMs = end - Date.now();
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
  }, [vitaliciaPromo]);


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
    const { qty, promo, lifetime, lifetimeBulk, combo, comboChampion, comboAccount, manusCredits, geminiPro, seedanceAccount, capcutPro, lovableAccount, planBasico, planPlus, planPro, planFundador } = pendingPixAction;
    setPixCustomerOpen(false);
    setLoadingQty(planPro ? -12 : planPlus ? -11 : planBasico ? -10 : lovableAccount ? -11 : capcutPro ? -10 : seedanceAccount ? -9 : geminiPro ? -8 : lifetimeBulk ? -7 : manusCredits ? -6 : comboAccount ? -5 : comboChampion ? -4 : combo ? -3 : lifetime ? -2 : promo ? -1 : qty);
    const order = await createOrder(qty, customerData, promo, lifetime, combo, comboChampion, undefined, comboAccount, manusCredits, lifetimeBulk, geminiPro, seedanceAccount, capcutPro, lovableAccount, planBasico, planPlus, planPro, planFundador);
    setLoadingQty(null);
    if (order) {
      setPixOrder(order);
      setLastOrderWasCombo(!!combo);
      setLastOrderWasComboChampion(!!comboChampion);
      setLastOrderWasComboAccount(!!comboAccount);
      setLastOrderWasManusCredits(!!manusCredits);
      setLastOrderWasGeminiPro(!!geminiPro);
      setLastOrderWasSeedance(!!seedanceAccount);
      setLastOrderWasCapcutPro(!!capcutPro);
      setLastOrderWasLovableAccount(!!lovableAccount);
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
    // Promoção relâmpago mensal: 1 chave por R$ 34,90 até 04/06/2026 Ã s 20h
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

  const handleBuyLifetimeBulk = () => {
    setPendingPixAction({ qty: 10, lifetimeBulk: true });
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
              <span>âš ï¸ Você precisa ter pelo menos 1 chave ativa para manter seu acesso.</span>
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

            <div className="w-full max-w-3xl mx-auto rounded-2xl overflow-hidden glow-card purple-glow animate-fade-up-delay-1">
              <img
                className="w-full h-auto max-h-[280px] sm:max-h-[340px] object-cover block"
                src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWQwcmZnOGprdnpocGpoczIwZm0zNTd1MHlxZjRsdGljemUyZDI0eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/HdkfFLWKT8XeFz4v57/giphy.gif"
                alt="LOV 3.0 Banner"
              />
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4 animate-fade-up-delay-2">
              <StatCard
                label="Saldo Disponível"
                value={statsLoading ? 'â€”' : `R$ ${((stats?.revenue || 0)).toFixed(2)}`}
                sub="Lucro acumulado"
                icon={DollarSign}
              />
              <StatCard
                label="Total Vendas"
                value={statsLoading ? 'â€”' : `R$ ${((stats?.revenue || 0)).toFixed(2)}`}
                sub="Faturamento total registrado"
                icon={DollarSign}
              />
              <StatCard
                label="Clientes Ativos"
                value={statsLoading ? 'â€”' : stats?.active || 0}
                sub="Licenças ativas"
                icon={Users}
              />
              <StatCard
                label="Chaves em Estoque"
                value={isUnlimited ? 'âˆž' : `${credits?.credits_used || 0}`}
                sub2={isUnlimited ? 'âˆž' : `${availableCredits}`}
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
            <CommunityDiscountBanner />
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
                {/* Planos de Assinatura */}
                <div>
                  <h2 className="text-2xl font-black text-foreground flex items-center gap-3 mb-1 font-display">
                    <ShoppingCart className="h-5 w-5 text-primary" />
                    Comprar <span className="text-gradient">Planos</span>
                  </h2>
                  <p className="text-sm text-muted-foreground mb-5 font-display">
                    Chaves mensais com limite de envios diário — renova automaticamente a cada 30 dias.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-3">
                    {/* Básico */}
                    <div className="relative group">
                      <div className="p-6 rounded-2xl border border-border/50 bg-card/60 hover:border-primary/40 hover:bg-card/80 transition-all duration-300 flex flex-col gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-display">Mensal</p>
                          <h3 className="text-xl font-black text-foreground font-display">Básico</h3>
                          <p className="text-sm text-muted-foreground">50 envios/dia • 1 dispositivo</p>
                        </div>
                        <div>
                          <span className="text-3xl font-black text-gradient">R$ 79,90</span>
                          <span className="text-sm text-muted-foreground font-display">/mês</span>
                        </div>
                        <Button
                          className="w-full rounded-xl font-display font-bold"
                          variant="outline"
                          disabled={loadingQty !== null}
                          onClick={() => { setPendingPixAction({ qty: 1, planBasico: true }); setPixCustomerOpen(true); }}
                        >
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          {loadingQty === -10 ? 'Gerando PIX...' : 'Comprar Básico'}
                        </Button>
                      </div>
                    </div>

                    {/* Plus — MAIS VENDIDO */}
                    <div className="relative">
                      <div className="absolute -inset-[2px] rounded-[1.1rem] z-0" style={{ background: 'linear-gradient(135deg, #f97316, #eab308, #f97316)', backgroundSize: '300% 300%', animation: 'fire-glow 3s ease infinite' }} />
                      <div className="relative p-6 rounded-2xl border border-transparent bg-card z-10 flex flex-col gap-4">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                          <span className="bg-gradient-to-r from-orange-500 via-yellow-400 to-orange-500 text-black text-[10px] font-extrabold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 whitespace-nowrap">
                            <Flame className="h-3 w-3" /> MAIS VENDIDO
                          </span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-display">Mensal</p>
                          <h3 className="text-xl font-black text-foreground font-display">Plus</h3>
                          <p className="text-sm text-muted-foreground">100 envios/dia • 1 dispositivo</p>
                        </div>
                        <div>
                          <span className="text-3xl font-black bg-gradient-to-r from-orange-400 to-yellow-300 bg-clip-text text-transparent">R$ 99,99</span>
                          <span className="text-sm text-muted-foreground font-display">/mês</span>
                        </div>
                        <Button
                          className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-yellow-500 text-black font-bold hover:opacity-90 shadow-lg shadow-orange-500/20 font-display"
                          disabled={loadingQty !== null}
                          onClick={() => { setPendingPixAction({ qty: 1, planPlus: true }); setPixCustomerOpen(true); }}
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          {loadingQty === -11 ? 'Gerando PIX...' : 'Comprar Plus'}
                        </Button>
                      </div>
                    </div>

                    {/* Pro */}
                    <div className="relative group">
                      <div className="absolute -inset-[2px] rounded-[1.1rem] z-0" style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1, #8b5cf6)', backgroundSize: '300% 300%', animation: 'fire-glow 4s ease infinite' }} />
                      <div className="relative p-6 rounded-2xl border border-transparent bg-card z-10 flex flex-col gap-4">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground font-display">Mensal</p>
                          <h3 className="text-xl font-black text-foreground font-display">Pro</h3>
                          <p className="text-sm text-muted-foreground">200 envios/dia • 1 dispositivo</p>
                        </div>
                        <div>
                          <span className="text-3xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">R$ 149,99</span>
                          <span className="text-sm text-muted-foreground font-display">/mês</span>
                        </div>
                        <Button
                          className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:opacity-90 shadow-lg shadow-violet-500/20 font-display"
                          disabled={loadingQty !== null}
                          onClick={() => { setPendingPixAction({ qty: 1, planPro: true }); setPixCustomerOpen(true); }}
                        >
                          <Zap className="mr-2 h-4 w-4" />
                          {loadingQty === -12 ? 'Gerando PIX...' : 'Comprar Pro'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LOV3 Fundador â€” TEMPO LIMITADO */}
                <div className="relative">
                  {/* Animated golden border */}
                  <div
                    className="absolute -inset-[2px] rounded-[1.3rem] z-0 opacity-95"
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b, #fbbf24, #d97706, #f59e0b)',
                      backgroundSize: '300% 300%',
                      animation: 'fire-glow 3s ease infinite',
                    }}
                  />
                  <div className="relative p-6 sm:p-7 rounded-3xl bg-card border border-transparent z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500/30 to-yellow-500/20 flex items-center justify-center shrink-0 text-2xl">
                        ★
                      </div>
                      <div>                          <span className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                            ⏳ TEMPO LIMITADO
                          </span>
                          <span className="bg-gradient-to-r from-amber-600/30 to-yellow-500/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500/30">
                            120 envios/dia
                          </span>
                        </div>
                        <h3 className="text-xl sm:text-2xl font-black text-foreground font-display">
                          LOV3 <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">Fundador</span>
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1 max-w-md">
                          Plano mensal exclusivo com <strong className="text-amber-300">120 envios/dia</strong> — o dobro do Básico, pelo mesmo preço. Benefício especial por tempo limitado.
                        </p>
                        <p className="text-xs text-amber-400/80 mt-2 font-medium">
                          Para clientes que possuíam plano vitalício descontinuado e novos usuários enquanto disponível.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto shrink-0">
                      <div className="text-right">
                        <span className="text-3xl font-black bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">R$ 79,90</span>
                        <p className="text-[11px] text-amber-400/70 font-bold">/mês • 120 prompts/dia</p>
                      </div>
                      <Button
                        disabled={loadingQty !== null}
                        onClick={() => { setPendingPixAction({ qty: 1, planFundador: true }); setPixCustomerOpen(true); }}
                        className="group relative overflow-hidden rounded-xl bg-[linear-gradient(110deg,#f59e0b,45%,#fbbf24,55%,#f59e0b)] bg-[length:200%_100%] text-black font-bold shadow-lg shadow-amber-500/40 w-full sm:w-auto transition-all duration-300 hover:scale-[1.04] active:scale-95"
                      >
                        <Zap className="mr-2 h-4 w-4" />
                        {loadingQty === -13 ? 'Gerando PIX...' : '★ Comprar Fundador'}
                      </Button>
                      <p className="text-[10px] text-center text-muted-foreground">Atribuído manualmente pelo admin</p>           <p className="text-[10px] text-center text-muted-foreground">Atribuído manualmente pelo admin</p>
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
                          <span className="text-sm">{license.customer_name || <span className="text-muted-foreground italic">â€”</span>}</span>
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
                        <p className="truncate text-foreground">{license.customer_name || 'â€”'}</p>
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
                  30 dias <span className="text-xs text-muted-foreground">(fixo â€” teste continua separado e licença comum não usa mais 1 ano)</span>
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
                <div><Label className="text-muted-foreground">Cliente</Label><p>{selectedLicense.customer_name || 'â€”'}</p></div>
                <div><Label className="text-muted-foreground">Email</Label><p>{selectedLicense.email}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><p><StatusBadge status={selectedLicense.status} /></p></div>
                <div><Label className="text-muted-foreground">Criada em</Label><p className="text-sm">{format(parseISO(selectedLicense.created_at), "dd/MM/yyyy 'Ã s' HH:mm", { locale: ptBR })}</p></div>
                <div><Label className="text-muted-foreground">Expira em</Label><p className="text-sm">{format(parseISO(selectedLicense.expires_at), "dd/MM/yyyy 'Ã s' HH:mm", { locale: ptBR })}</p></div>
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
                ðŸŽ‰ Promoção de Inauguração
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Pacote especial: <span className="font-bold text-orange-500">10 chaves por R$ 249,90</span> â€” só nas próximas 24h!
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

        {/* Combo Requirements Dialog */}
        <AlertDialog open={comboRequirementsOpen} onOpenChange={setComboRequirementsOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-400" />
                Requisitos do Combo
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Antes de comprar, confirme que você atende aos requisitos:</p>
                  <ul className="space-y-2 list-none pl-0">
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> A conta Lovable que receberá os créditos deve ser do plano <span className="font-bold text-foreground">FREE</span> (sem assinatura ativa).</li>
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> Os 300 créditos + 1 Ano PRO Lite serão aplicados nessa conta FREE.</li>
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> Após o pagamento, você receberá o link do grupo e deverá enviar o comprovante ao ADM para liberação.</li>
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> Compra não reembolsável após ativação.</li>
                  </ul>
                  <label className="flex items-start gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={comboAccepted}
                      onChange={(e) => setComboAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-purple-500"
                    />
                    <span className="text-foreground">Li, entendi e confirmo que minha conta é <span className="font-bold">FREE</span>.</span>
                  </label>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setComboAccepted(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!comboAccepted}
                onClick={() => {
                  setComboRequirementsOpen(false);
                  setPendingPixAction({ qty: 1, combo: true });
                  setPixCustomerOpen(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              >
                Continuar para pagamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Combo Copa do Brasil Requirements Dialog */}
        <AlertDialog open={comboChampionRequirementsOpen} onOpenChange={setComboChampionRequirementsOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
                Requisitos do Combo Copa do Brasil
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Você está adquirindo:</p>
                  <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-yellow-200">
                    <p className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Atenção
                    </p>
                    <p className="text-sm mt-1">
                      Funciona <span className="font-bold">apenas em contas Manus AI criadas há no máximo 3 meses</span>. Contas mais antigas não recebem os créditos.
                    </p>
                  </div>
                  <ul className="space-y-2 list-none pl-0">
                    <li className="flex gap-2"><span className="text-yellow-400">â—</span> <span><span className="font-bold text-foreground">300 Créditos Lovable</span> aplicados em uma conta <span className="font-bold">FREE</span>.</span></li>
                    <li className="flex gap-2"><span className="text-yellow-400">â—</span> <span><span className="font-bold text-foreground">1 Ano de PRO Lite</span> na mesma conta FREE.</span></li>
                    <li className="flex gap-2"><span className="text-yellow-400">â—</span> <span><span className="font-bold text-foreground">1 Chave Vitalícia</span> (validade ilimitada) para revenda.</span></li>
                    <li className="flex gap-2"><span className="text-yellow-400">â—</span> Após o pagamento, envie o comprovante ao ADM no WhatsApp para liberação do combo e entrada no grupo.</li>
                    <li className="flex gap-2"><span className="text-yellow-400">â—</span> Compra não reembolsável após ativação.</li>
                  </ul>
                  <label className="flex items-start gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={comboChampionAccepted}
                      onChange={(e) => setComboChampionAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-yellow-500"
                    />
                    <span className="text-foreground">Li, entendi e confirmo que a conta Lovable de destino é <span className="font-bold">FREE</span>.</span>
                  </label>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setComboChampionAccepted(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!comboChampionAccepted}
                onClick={() => {
                  setComboChampionRequirementsOpen(false);
                  setPendingPixAction({ qty: 1, comboChampion: true });
                  setPixCustomerOpen(true);
                }}
                className="bg-gradient-to-r from-yellow-500 to-green-500 text-black"
              >
                Continuar para pagamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Combo Conta Lovable Requirements Dialog */}
        <AlertDialog open={comboAccountRequirementsOpen} onOpenChange={setComboAccountRequirementsOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-pink-400" />
                Requisitos do Combo Conta Lovable
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Você está adquirindo:</p>
                  <ul className="space-y-2 list-none pl-0">
                    <li className="flex gap-2"><span className="text-pink-400">â—</span> <span><span className="font-bold text-foreground">Conta Lovable</span> nova com login e senha enviados por e-mail.</span></li>
                    <li className="flex gap-2"><span className="text-pink-400">â—</span> <span><span className="font-bold text-foreground">300 Créditos Lovable</span> aplicados instantaneamente.</span></li>
                    <li className="flex gap-2"><span className="text-pink-400">â—</span> <span><span className="font-bold text-foreground">1 Ano de PRO</span> com recursos ilimitados.</span></li>
                    <li className="flex gap-2"><span className="text-pink-400">â—</span> Após o pagamento, envie o comprovante ao ADM no grupo para liberação da conta.</li>
                    <li className="flex gap-2"><span className="text-pink-400">â—</span> Compra não reembolsável após a entrega das credenciais.</li>
                  </ul>
                  <label className="flex items-start gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={comboAccountAccepted}
                      onChange={(e) => setComboAccountAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-pink-500"
                    />
                    <span className="text-foreground">Li, entendi e confirmo a compra do combo <span className="font-bold">Conta Lovable</span>.</span>
                  </label>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setComboAccountAccepted(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!comboAccountAccepted}
                onClick={() => {
                  setComboAccountRequirementsOpen(false);
                  setPendingPixAction({ qty: 1, comboAccount: true });
                  setPixCustomerOpen(true);
                }}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
              >
                Continuar para pagamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Manus AI Credits Requirements Dialog */}
        <AlertDialog open={manusCreditsRequirementsOpen} onOpenChange={setManusCreditsRequirementsOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-cyan-400" />
                Requisitos â€” 1000 Créditos Manus AI
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Você está adquirindo:</p>
                  <ul className="space-y-2 list-none pl-0">
                    <li className="flex gap-2"><span className="text-cyan-400">â—</span> <span><span className="font-bold text-foreground">1000 Créditos Manus AI</span> aplicados na sua conta Manus.</span></li>
                    <li className="flex gap-2"><span className="text-cyan-400">â—</span> Entrega imediata após confirmação manual.</li>
                    <li className="flex gap-2"><span className="text-cyan-400">â—</span> Após o pagamento, envie o comprovante ao ADM no grupo para liberação dos créditos.</li>
                    <li className="flex gap-2"><span className="text-cyan-400">â—</span> Compra não reembolsável após a entrega dos créditos.</li>
                  </ul>
                  <label className="flex items-start gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={manusCreditsAccepted}
                      onChange={(e) => setManusCreditsAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-cyan-500"
                    />
                    <span className="text-foreground">Li, entendi e confirmo a compra de <span className="font-bold">1000 Créditos Manus AI</span>.</span>
                  </label>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setManusCreditsAccepted(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!manusCreditsAccepted}
                onClick={() => {
                  setManusCreditsRequirementsOpen(false);
                  setPendingPixAction({ qty: 1, manusCredits: true });
                  setPixCustomerOpen(true);
                }}
                className="bg-gradient-to-r from-cyan-500 to-teal-500 text-white"
              >
                Continuar para pagamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Gemini Pro Requirements Dialog */}
        <AlertDialog open={geminiProRequirementsOpen} onOpenChange={setGeminiProRequirementsOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-indigo-400" />
                Requisitos â€” Gemini Pro 18 Meses
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Você está adquirindo:</p>
                  <ul className="space-y-2 list-none pl-0">
                    <li className="flex gap-2"><span className="text-indigo-400">â—</span> <span><span className="font-bold text-foreground">Gemini Pro â€” 18 meses de assinatura</span> ativados direto na sua conta Google.</span></li>
                    <li className="flex gap-2"><span className="text-indigo-400">â—</span> Inclui 5 TB no Google One, Gemini 3.1 Pro + Nano Banana Pro, Veo 3, Flow, Whisk, NotebookLM, Deep Research, Code Assist, Antigravity e CLI.</li>
                    <li className="flex gap-2"><span className="text-indigo-400">â—</span> Ativação manual pelo ADM após o pagamento â€” envie o comprovante no grupo com o email da sua conta Google.</li>
                    <li className="flex gap-2"><span className="text-indigo-400">â—</span> Compra não reembolsável após a ativação.</li>
                  </ul>
                  <label className="flex items-start gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={geminiProAccepted}
                      onChange={(e) => setGeminiProAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-indigo-500"
                    />
                    <span className="text-foreground">Li, entendi e confirmo a compra do <span className="font-bold">Gemini Pro 18 Meses</span>.</span>
                  </label>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setGeminiProAccepted(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!geminiProAccepted}
                onClick={() => {
                  setGeminiProRequirementsOpen(false);
                  setPendingPixAction({ qty: 1, geminiPro: true });
                  setPixCustomerOpen(true);
                }}
                className="bg-gradient-to-r from-indigo-500 to-pink-500 text-white"
              >
                Continuar para pagamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Seedance Account Requirements Dialog */}
        <AlertDialog open={seedanceRequirementsOpen} onOpenChange={setSeedanceRequirementsOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-400" />
                Requisitos â€” Conta Seedance 8.500K
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Você está adquirindo:</p>
                  <ul className="space-y-2 list-none pl-0">
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> <span><span className="font-bold text-foreground">1 Conta Seedance</span> com <span className="font-bold text-foreground">8.500K créditos</span> garantidos.</span></li>
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> Geração ultrarrápida de vídeos profissionais em qualidade cinematográfica.</li>
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> Acesso completo Ã  conta premium (login + senha entregues pelo ADM).</li>
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> Entrega manual pelo ADM após o pagamento â€” envie o comprovante no grupo do WhatsApp.</li>
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> Compra não reembolsável após a entrega.</li>
                  </ul>
                  <label className="flex items-start gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={seedanceAccepted}
                      onChange={(e) => setSeedanceAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-purple-500"
                    />
                    <span className="text-foreground">Li, entendi e confirmo a compra da <span className="font-bold">Conta Seedance 8.500K</span>.</span>
                  </label>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSeedanceAccepted(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!seedanceAccepted}
                onClick={() => {
                  setSeedanceRequirementsOpen(false);
                  setPendingPixAction({ qty: 1, seedanceAccount: true });
                  setPixCustomerOpen(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white"
              >
                Continuar para pagamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* CapCut Pro Requirements Dialog */}
        <AlertDialog open={capcutProRequirementsOpen} onOpenChange={setCapcutProRequirementsOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-purple-400" />
                Requisitos â€” CapCut Pro 30 dias
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">Você está adquirindo:</p>
                  <ul className="space-y-2 list-none pl-0">
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> <span><span className="font-bold text-foreground">Acesso CapCut Pro</span> por <span className="font-bold text-foreground">30 dias</span> (login e senha).</span></li>
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> Todos os recursos PRO liberados, exportação em 4K e sem marca d'água.</li>
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> Acesso completo Ã  conta premium (login + senha entregues pelo ADM).</li>
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> Entrega manual pelo ADM via WhatsApp após o pagamento â€” envie o comprovante no grupo.</li>
                    <li className="flex gap-2"><span className="text-purple-400">â—</span> Compra não reembolsável após a entrega.</li>
                  </ul>
                  <label className="flex items-start gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={capcutProAccepted}
                      onChange={(e) => setCapcutProAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-purple-500"
                    />
                    <span className="text-foreground">Li, entendi e confirmo a compra do <span className="font-bold">CapCut Pro 30 dias</span>.</span>
                  </label>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setCapcutProAccepted(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!capcutProAccepted}
                onClick={() => {
                  setCapcutProRequirementsOpen(false);
                  setPendingPixAction({ qty: 1, capcutPro: true });
                  setPixCustomerOpen(true);
                }}
                className="bg-gradient-to-r from-purple-500 to-fuchsia-500 text-white"
              >
                Continuar para pagamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Conta Lovable AI Pro Requirements Dialog */}
        <AlertDialog open={lovableAccountRequirementsOpen} onOpenChange={setLovableAccountRequirementsOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-violet-400" />
                Requisitos â€” Lovable AI Pro | Conta Privada
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">O que está incluído:</p>
                  <ul className="space-y-2 list-none pl-0">
                    <li className="flex gap-2"><span className="text-violet-400">â—</span> <span>Plano <span className="font-bold text-foreground">Pro de 1 mês</span> (30 dias).</span></li>
                    <li className="flex gap-2"><span className="text-violet-400">â—</span> <span><span className="font-bold text-foreground">105 créditos</span> inclusos.</span></li>
                    <li className="flex gap-2"><span className="text-violet-400">â—</span> Conta segura e privada, com acesso total ao e-mail incluído.</li>
                    <li className="flex gap-2"><span className="text-violet-400">â—</span> Acesso imediato â€” entrega automática após a confirmação do pagamento.</li>
                  </ul>
                  <p className="font-semibold text-foreground pt-1">IMPORTANTE:</p>
                  <ul className="space-y-2 list-none pl-0">
                    <li className="flex gap-2"><span className="text-amber-400">â—</span> Transferências de workspace e de projetos não são garantidas. Não oferecemos garantia para problemas relacionados a transferências.</li>
                    <li className="flex gap-2"><span className="text-amber-400">â—</span> Se aparecer a mensagem de "Atividade Suspeita" ao fazer login, tente usar uma VPN e faça login novamente.</li>
                    <li className="flex gap-2"><span className="text-amber-400">â—</span> Transferências podem parar de funcionar devido a mudanças nas políticas e sistemas da Lovable.</li>
                    <li className="flex gap-2"><span className="text-amber-400">â—</span> Precisa de ajuda? Fale com o suporte a qualquer momento.</li>
                  </ul>
                  <label className="flex items-start gap-2 pt-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lovableAccountAccepted}
                      onChange={(e) => setLovableAccountAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-purple-500"
                    />
                    <span className="text-foreground">Li, entendi e confirmo a compra da <span className="font-bold">Conta Lovable AI Pro (105 créditos)</span>.</span>
                  </label>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setLovableAccountAccepted(false)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                disabled={!lovableAccountAccepted}
                onClick={() => {
                  setLovableAccountRequirementsOpen(false);
                  setPendingPixAction({ qty: 1, lovableAccount: true });
                  setPixCustomerOpen(true);
                }}
                className="bg-gradient-to-r from-violet-600 to-purple-500 text-white"
              >
                Continuar para pagamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                {lastOrderWasLovableAccount ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      <span className="font-semibold text-foreground">Conta Lovable AI Pro (105 créditos)</span> reservada. Entre no grupo, chame o ADM e envie o comprovante para receber o login, a senha e o acesso ao e-mail da conta.
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => { setIsPixModalOpen(false); setPixOrder(null); setLastOrderWasLovableAccount(false); }}>
                      Fechar
                    </Button>
                  </>
                ) : lastOrderWasCapcutPro ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      <span className="font-semibold text-foreground">CapCut Pro 30 dias</span> reservado. Entre no grupo, chame o ADM e envie o comprovante para receber o login e a senha via WhatsApp.
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => { setIsPixModalOpen(false); setPixOrder(null); setLastOrderWasCapcutPro(false); }}>
                      Fechar
                    </Button>
                  </>
                ) : lastOrderWasSeedance ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      <span className="font-semibold text-foreground">Conta Seedance 8.500K</span> reservada. Entre no grupo, chame o ADM e envie o comprovante para receber o login e a senha da conta.
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => { setIsPixModalOpen(false); setPixOrder(null); setLastOrderWasSeedance(false); }}>
                      Fechar
                    </Button>
                  </>
                ) : lastOrderWasGeminiPro ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      <span className="font-semibold text-foreground">Gemini Pro 18 Meses</span> reservado. Entre no grupo, chame o ADM e envie o comprovante com o email da sua conta Google para ativação.
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => { setIsPixModalOpen(false); setPixOrder(null); setLastOrderWasGeminiPro(false); }}>
                      Fechar
                    </Button>
                  </>
                ) : lastOrderWasManusCredits ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      <span className="font-semibold text-foreground">1000 Créditos Manus AI</span> recebidos. Entre no grupo, chame o ADM e envie o comprovante para liberação dos créditos na sua conta Manus.
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => { setIsPixModalOpen(false); setPixOrder(null); setLastOrderWasManusCredits(false); }}>
                      Fechar
                    </Button>
                  </>
                ) : lastOrderWasComboAccount ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      Combo <span className="font-semibold text-foreground">Conta Lovable (Conta + 300 Créditos + 1 Ano PRO)</span> recebido. Entre no grupo, chame o ADM e envie o comprovante para receber o login e a senha da conta.
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => { setIsPixModalOpen(false); setPixOrder(null); setLastOrderWasComboAccount(false); }}>
                      Fechar
                    </Button>
                  </>
                ) : lastOrderWasComboChampion ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      Combo <span className="font-semibold text-foreground">Copa do Brasil (300 Créditos + 1 Ano PRO Lite + Chave Vitalícia)</span> recebido. Entre no grupo, chame o ADM e envie o comprovante para liberação do combo.
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => { setIsPixModalOpen(false); setPixOrder(null); setLastOrderWasComboChampion(false); }}>
                      Fechar
                    </Button>
                  </>
                ) : lastOrderWasCombo ? (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      Combo <span className="font-semibold text-foreground">300 Créditos + 1 Ano PRO Lite</span> recebido. Entre no grupo, chame o ADM e envie o comprovante para ativação do combo.
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => { setIsPixModalOpen(false); setPixOrder(null); setLastOrderWasCombo(false); }}>
                      Fechar
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      {pixOrder?.quantity} crédito(s) foram adicionados Ã  sua conta.
                    </p>
                    <Button onClick={() => { setIsPixModalOpen(false); setPixOrder(null); }} className="bg-gradient text-primary-foreground">
                      Fechar
                    </Button>
                  </>
                )}
              </div>
            ) : pixOrder ? (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground">{pixOrder.quantity}</span> chave(s) Ã— R$ {pixOrder.price_per_key.toFixed(2)}
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
    if (totalMinutes < 60) return <span className="text-xs text-muted-foreground">â³ {Math.round(totalMinutes)}min (aguardando)</span>;
    return <span className="text-xs text-muted-foreground">â³ {Math.round(durationHours)}h (aguardando)</span>;
  }
  const now = new Date();
  const expiry = parseISO(expiresAt);
  if (expiry < now) return <span className="text-xs text-destructive">Expirado</span>;
  const days = differenceInDays(expiry, now);
  if (days > 365) return <span className="text-xs text-muted-foreground">âˆž</span>;
  if (days > 0) return <span className="text-xs text-muted-foreground">{days}d</span>;
  const hours = differenceInHours(expiry, now);
  if (hours > 0) return <span className="text-xs text-warning">{hours}h</span>;
  const minutes = differenceInMinutes(expiry, now);
  return <span className="text-xs text-destructive">{minutes}min</span>;
}
