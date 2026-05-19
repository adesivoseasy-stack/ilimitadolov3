import { useState, useEffect, useCallback } from 'react';
import { PixCustomerDialog, PixCustomerFormData } from '@/components/reseller/PixCustomerDialog';
import { PixQrCode } from '@/components/reseller/PixQrCode';
import coinsIcon from '@/assets/coins-icon.png';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLvbCredits } from '@/hooks/useLvbCredits';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Coins, ArrowRight, Copy, CheckCircle2, Loader2, ExternalLink,
  ShieldCheck, Clock, QrCode, HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import tutorialStep1 from '@/assets/tutorial-step1.png';
import tutorialStep2 from '@/assets/tutorial-step2.png';
import tutorialStep3 from '@/assets/tutorial-step3.png';

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

type WizardStep = 'select' | 'pix' | 'created' | 'invite' | 'promote' | 'tracking';

interface PixState {
  orderId: string;
  pixCodeText: string;
  pixQrCode: string;
  amountCents: number;
  creditos: number;
}

interface OrderState {
  pedidoId: string;
  creditos: number;
  linkCliente: string;
  emailBot: string;
  acaoId?: string;
  workspaceId?: string;
  workspaceName?: string;
  status: string;
  motivo?: string;
}

const WIZARD_STORAGE_KEY = 'lvb_wizard_state';
const SUCCESS_STATUSES = new Set(['sucesso', 'entregue']);
const TERMINAL_STATUSES = new Set(['sucesso', 'entregue', 'falha']);
const TRACKING_STATUSES = new Set(['recarregando', 'sucesso', 'entregue', 'falha']);

interface LvbCreditOrderRecord {
  id: string;
  status: string;
  external_order_id: string | null;
  link_cliente: string | null;
  email_bot: string | null;
  workspace_id: string | null;
  workspace_name: string | null;
  creditos: number;
}

function normalizeOrderStatus(status?: string | null) {
  if (!status) return 'configurando';
  return status === 'entregue' ? 'sucesso' : status;
}

function isSuccessStatus(status?: string | null) {
  return SUCCESS_STATUSES.has(status ?? '');
}

function isTerminalStatus(status?: string | null) {
  return TERMINAL_STATUSES.has(status ?? '');
}

function shouldUseTrackingStep(status?: string | null) {
  return TRACKING_STATUSES.has(status ?? '');
}

function buildOrderState(record: LvbCreditOrderRecord, fallback: OrderState | null = null): OrderState {
  return {
    pedidoId: record.external_order_id || fallback?.pedidoId || '',
    creditos: record.creditos || fallback?.creditos || 0,
    linkCliente: record.link_cliente || fallback?.linkCliente || '',
    emailBot: record.email_bot || fallback?.emailBot || '',
    workspaceId: record.workspace_id || fallback?.workspaceId,
    workspaceName: record.workspace_name || fallback?.workspaceName,
    status: normalizeOrderStatus(record.status),
    motivo: fallback?.motivo,
    acaoId: fallback?.acaoId,
  };
}

function saveWizardState(step: WizardStep, pixState: PixState | null, order: OrderState | null) {
  try {
    if (step === 'select') {
      localStorage.removeItem(WIZARD_STORAGE_KEY);
      return;
    }
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({ step, pixState, order, savedAt: Date.now() }));
  } catch {}
}

function loadWizardState(): { step: WizardStep; pixState: PixState | null; order: OrderState | null } | null {
  try {
    const raw = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire after 2 hours
    if (Date.now() - parsed.savedAt > 2 * 60 * 60 * 1000) {
      localStorage.removeItem(WIZARD_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function LvbCreditsTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const lvb = useLvbCredits();

  const saved = loadWizardState();
  const [packages, setPackages] = useState(DEFAULT_PACKAGES);
  const [step, setStep] = useState<WizardStep>(saved?.step || 'select');
  const [pixState, setPixState] = useState<PixState | null>(saved?.pixState || null);
  const [order, setOrder] = useState<OrderState | null>(saved?.order || null);
  const [orders, setOrders] = useState<any[]>([]);
  const [polling, setPolling] = useState(false);
  const [pixLoading, setPixLoading] = useState(false);
  const [pixCustomerOpen, setPixCustomerOpen] = useState(false);
  const [pendingPackage, setPendingPackage] = useState<typeof packages[0] | null>(null);
  const [confirmingInvite, setConfirmingInvite] = useState(false);
  const [confirmingPromotion, setConfirmingPromotion] = useState(false);
  const [popupBlockedUrl, setPopupBlockedUrl] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(1);
  const [requirementsOpen, setRequirementsOpen] = useState(false);

  // Persist wizard state on changes
  useEffect(() => {
    saveWizardState(step, pixState, order);
  }, [step, pixState, order]);

  // Fetch custom prices from system_config
  const fetchPrices = useCallback(async () => {
    const { data } = await supabase
      .from('system_config')
      .select('key, value')
      .like('key', 'lvb_package_%');

    const priceMap = new Map<number, number>();
    (data || []).forEach((c: any) => {
      const credits = parseInt(c.key.replace('lvb_package_', ''));
      if (credits && c.value) priceMap.set(credits, parseFloat(c.value));
    });

    if (priceMap.size > 0) {
      setPackages(DEFAULT_PACKAGES.map(pkg => ({
        credits: pkg.credits,
        price: priceMap.get(pkg.credits) ?? pkg.price,
      })));
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from('lvb_credit_orders')
      .select('*')
      .eq('reseller_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setOrders(data);
  }, [user?.id]);

  useEffect(() => {
    fetchOrders();
    fetchPrices();
  }, [fetchOrders, fetchPrices]);

  useEffect(() => {
    if (!user?.id || (!order?.pedidoId && !pixState?.orderId)) return;

    let cancelled = false;

    const reconcileSavedState = async () => {
      const lookupExternalOrderId = order?.pedidoId || '00000000-0000-0000-0000-000000000000';
      const lookupInternalOrderId = pixState?.orderId || '00000000-0000-0000-0000-000000000000';

      const { data } = await supabase
        .from('lvb_credit_orders')
        .select('id, status, external_order_id, link_cliente, email_bot, workspace_id, workspace_name, creditos')
        .eq('reseller_id', user.id)
        .or(`external_order_id.eq.${lookupExternalOrderId},id.eq.${lookupInternalOrderId}`)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (cancelled || !data?.length) return;

      const latestOrder = data[0] as LvbCreditOrderRecord;
      const nextOrder = buildOrderState(latestOrder, order);

      if (shouldUseTrackingStep(latestOrder.status)) {
        setOrder(nextOrder);
        setStep('tracking');
        return;
      }

      if (latestOrder.status === 'configurando' && latestOrder.external_order_id) {
        setOrder(nextOrder);
        setStep(latestOrder.workspace_name || nextOrder.workspaceName ? 'promote' : 'created');
        return;
      }

      if (latestOrder.status === 'pending_payment' && pixState?.orderId === latestOrder.id) {
        setStep('pix');
      }
    };

    reconcileSavedState();

    return () => {
      cancelled = true;
    };
  }, [user?.id, order?.pedidoId, pixState?.orderId]);

  useEffect(() => {
    if (step !== 'pix' || !pixState?.orderId) return;

    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('lvb_credit_orders' as any)
        .select('status, external_order_id, link_cliente, email_bot')
        .eq('id', pixState.orderId)
        .single();

      if (data) {
        const d = data as any;
        if (shouldUseTrackingStep(d.status) && d.external_order_id) {
          clearInterval(interval);

          setOrder({
            pedidoId: d.external_order_id,
            creditos: pixState.creditos,
            linkCliente: d.link_cliente || '',
            emailBot: d.email_bot || '',
            workspaceName: d.workspace_name || '',
            status: normalizeOrderStatus(d.status),
          });
          setStep('tracking');
          fetchOrders();
        } else if (d.status === 'configurando' && d.external_order_id) {
          clearInterval(interval);

          let emailBot = d.email_bot || '';
          let linkCliente = d.link_cliente || '';

          if (!emailBot) {
            const liveOrder = await lvb.getOrder(d.external_order_id);
            emailBot = liveOrder?.emailConviteBot || emailBot;
            linkCliente = liveOrder?.linkCliente || linkCliente;
          }

          setOrder({
            pedidoId: d.external_order_id,
            creditos: pixState.creditos,
            linkCliente,
            emailBot,
            status: 'configurando',
          });
          setStep('created');
          toast({ title: '✅ Pagamento confirmado!', description: 'Agora configure o workspace do cliente.' });
          fetchOrders();
        } else if (d.status === 'falha') {
          clearInterval(interval);
          toast({ title: '❌ Falha no pedido', description: 'Erro ao processar. Tente novamente.', variant: 'destructive' });
          setStep('select');
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [step, pixState?.orderId, pixState?.creditos, toast, fetchOrders, lvb]);

  useEffect(() => {
    if (!order?.pedidoId || order.emailBot) return;

    const loadMissingBotEmail = async () => {
      const liveOrder = await lvb.getOrder(order.pedidoId);
      if (!liveOrder?.emailConviteBot && !liveOrder?.linkCliente) return;

      setOrder((prev) => prev ? {
        ...prev,
        emailBot: liveOrder.emailConviteBot || prev.emailBot,
        linkCliente: liveOrder.linkCliente || prev.linkCliente,
      } : prev);
    };

    loadMissingBotEmail();
  }, [order?.pedidoId, order?.emailBot, lvb]);

  useEffect(() => {
    if (step !== 'tracking' || !order?.pedidoId || isTerminalStatus(order.status)) return;

    setPolling(true);
    const interval = setInterval(async () => {
      const res = await lvb.getOrder(order.pedidoId);
      if (res) {
        const nextStatus = normalizeOrderStatus(res.status || order.status);
        setOrder((prev) => (prev ? {
          ...prev,
          status: nextStatus,
          emailBot: res.emailConviteBot || prev.emailBot,
          linkCliente: res.linkCliente || prev.linkCliente,
          workspaceName: res.workspaceNome || res.workspaceName || prev.workspaceName,
        } : prev));
        if (!isSuccessStatus(order.status) || isTerminalStatus(nextStatus)) {
          await supabase
            .from('lvb_credit_orders')
            .update({ status: nextStatus, workspace_id: res.workspaceId, workspace_name: res.workspaceNome || res.workspaceName } as any)
            .eq('external_order_id', order.pedidoId);
        }

        if (isTerminalStatus(nextStatus)) {
          setPolling(false);
          clearInterval(interval);
          fetchOrders();
          if (isSuccessStatus(nextStatus)) {
            toast({ title: '✅ Créditos entregues!', description: `${order.creditos} créditos foram entregues com sucesso.` });
          } else {
            toast({ title: '❌ Falha no pedido', description: 'Houve um erro. Entre em contato com o suporte.', variant: 'destructive' });
          }
        }
      }
    }, 15000);

    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [step, order?.pedidoId, order?.creditos, lvb, toast, fetchOrders]);

  const handleSelectPackage = (pkg: typeof packages[0]) => {
    setPendingPackage(pkg);
    setRequirementsOpen(true);
  };

  const handleAcceptRequirements = () => {
    setRequirementsOpen(false);
    // Pequeno delay para evitar conflito de overlays do Radix (AlertDialog fechando + Dialog abrindo)
    setTimeout(() => {
      setPixCustomerOpen(true);
    }, 250);
  };

  const handlePixCustomerConfirm = async (customerData: PixCustomerFormData) => {
    if (!pendingPackage) {
      toast({
        title: 'Selecione o pacote novamente',
        description: 'O pacote escolhido não foi encontrado. Feche esta janela e selecione os créditos novamente.',
        variant: 'destructive',
      });
      return;
    }
    setPixLoading(true);
    let created = false;
    try {
      const { data, error } = await supabase.functions.invoke('create-lvb-pix', {
        body: {
          creditos: pendingPackage.credits,
          customerName: customerData.customerName,
          customerEmail: customerData.customerEmail,
          customerPhone: customerData.customerPhone,
          customerDocument: customerData.customerDocument,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.order_id || !data?.pix_code_text) throw new Error('A cobrança PIX não retornou o código de pagamento. Tente novamente.');

      setPixCustomerOpen(false);
      setPixState({
        orderId: data.order_id,
        pixCodeText: data.pix_code_text,
        pixQrCode: data.pix_qr_code,
        amountCents: data.amount_cents,
        creditos: data.creditos,
      });
      setStep('pix');
      created = true;
    } catch (err: any) {
      const details = err?.context?.error || err?.message || 'Erro ao gerar PIX';
      toast({ title: 'Erro ao gerar PIX', description: details, variant: 'destructive' });
    } finally {
      setPixLoading(false);
      if (created) setPendingPackage(null);
    }
  };

  const handleConfirmInvite = async () => {
    if (!order) return;
    setConfirmingInvite(true);
    try {
      let res: any = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        res = await lvb.confirmInvite(order.pedidoId);
        if (res) break;
        await new Promise(r => setTimeout(r, 3000));
      }
      if (!res) {
        setConfirmingInvite(false);
        toast({ title: 'Erro', description: 'Não foi possível confirmar após várias tentativas. Tente novamente.', variant: 'destructive' });
        return;
      }

      setOrder((prev) => (prev ? { ...prev, acaoId: res.acaoId } : prev));

      let attempts = 0;
      const poll = setInterval(async () => {
        attempts++;
        if (attempts > 20 || !res.acaoId) {
          clearInterval(poll);
          setConfirmingInvite(false);
          return;
        }

        const actionRes = await lvb.getAction(order.pedidoId, res.acaoId);
        if (actionRes?.status === 'finalizada') {
          clearInterval(poll);
          setConfirmingInvite(false);
          const motivo = actionRes.resultado?.motivo;
          setOrder((prev) => prev ? {
            ...prev,
            motivo,
            workspaceId: actionRes.resultado?.workspace_id,
            workspaceName: actionRes.resultado?.workspace_nome,
          } : prev);

          if (motivo === 'confirmado') {
            setStep('tracking');
          } else if (motivo === 'permissao_incorreta') {
            setStep('promote');
          } else if (motivo === 'nao_encontrado') {
            toast({ title: 'Convite não encontrado', description: 'Verifique se o email correto foi convidado e tente novamente.', variant: 'destructive' });
          }
        }
      }, 3000);
    } catch {
      setConfirmingInvite(false);
    }
  };

  const handleConfirmPromotion = async () => {
    if (!order) return;
    setConfirmingPromotion(true);

    const syncLiveOrderState = async () => {
      const liveOrder = await lvb.getOrder(order.pedidoId);
      if (!liveOrder) return null;

      const liveStatus = normalizeOrderStatus(liveOrder.status || order.status);
      const workspaceName = liveOrder.workspaceNome || liveOrder.workspaceName || order.workspaceName;
      const linkCliente = liveOrder.linkCliente || order.linkCliente;
      const emailBot = liveOrder.emailConviteBot || order.emailBot;

      setOrder((prev) => prev ? {
        ...prev,
        status: liveStatus,
        workspaceName,
        linkCliente,
        emailBot,
      } : prev);

      if (shouldUseTrackingStep(liveStatus)) {
        setStep('tracking');
        if (isSuccessStatus(liveStatus)) {
          toast({ title: '✅ Créditos já entregues!', description: 'Este pedido já foi concluído.' });
        }
      } else if (workspaceName) {
        setStep('promote');
      } else {
        setStep('created');
      }

      return { liveStatus, workspaceName };
    };

    const beforeConfirm = await syncLiveOrderState();
    if (beforeConfirm?.liveStatus && shouldUseTrackingStep(beforeConfirm.liveStatus)) {
      setConfirmingPromotion(false);
      return;
    }

    let res: any = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      res = await lvb.confirmInvite(order.pedidoId);
      if (res) break;
      await new Promise(r => setTimeout(r, 3000));
    }

    if (!res) {
      const afterFailedConfirm = await syncLiveOrderState();
      setConfirmingPromotion(false);
      if (afterFailedConfirm?.liveStatus && shouldUseTrackingStep(afterFailedConfirm.liveStatus)) {
        return;
      }
      if (afterFailedConfirm?.workspaceName) {
        toast({
          title: 'Convite já identificado',
          description: 'Agora promova o bot para Owner no workspace e confirme novamente.',
        });
        return;
      }

      toast({
        title: 'Não foi possível confirmar agora',
        description: 'Atualize o workspace e tente novamente em alguns segundos.',
        variant: 'destructive',
      });
      return;
    }

    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      if (attempts > 20 || !res.acaoId) {
        clearInterval(poll);
        setConfirmingPromotion(false);
        await syncLiveOrderState();
        return;
      }

      const actionRes = await lvb.getAction(order.pedidoId, res.acaoId);
      if (actionRes?.status === 'finalizada') {
        clearInterval(poll);
        setConfirmingPromotion(false);
        const motivo = actionRes.resultado?.motivo;
        if (motivo === 'confirmado') {
          setStep('tracking');
          toast({ title: '✅ Bot autorizado!', description: 'O farm de créditos iniciará automaticamente.' });
        } else if (motivo === 'permissao_incorreta') {
          toast({ title: 'Permissão insuficiente', description: 'O bot ainda não tem permissão Owner. Altere e tente novamente.', variant: 'destructive' });
        } else {
          await syncLiveOrderState();
          toast({ title: 'Erro', description: 'Convite não encontrado. Refaça o convite.', variant: 'destructive' });
        }
      }
    }, 3000);
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Texto copiado para a área de transferência.' });
  };

  const openCustomerPopup = (url: string) => {
    const targetUrl = url?.trim();
    if (!targetUrl) return;

    const popup = window.open(
      targetUrl,
      'lvbcredits-order',
      'popup=yes,width=1280,height=900,resizable=yes,scrollbars=yes'
    );

    if (popup) {
      popup.focus?.();
      setPopupBlockedUrl(null);
      return;
    }

    setPopupBlockedUrl(targetUrl);
    toast({
      title: 'Popup bloqueado',
      description: 'O navegador bloqueou a janela. Use o botão abaixo para abrir manualmente.',
      variant: 'destructive',
    });
  };

  const resetWizard = () => {
    setStep('select');
    setOrder(null);
    setPixState(null);
    localStorage.removeItem(WIZARD_STORAGE_KEY);
    fetchOrders();
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending_payment: { label: 'Aguardando PIX', variant: 'outline' },
      paid: { label: 'Pago', variant: 'secondary' },
      aguardando: { label: 'Aguardando', variant: 'outline' },
      configurando: { label: 'Configurando', variant: 'secondary' },
      recarregando: { label: 'Recarregando', variant: 'default' },
      entregue: { label: 'Entregue', variant: 'default' },
      sucesso: { label: 'Sucesso', variant: 'default' },
      falha: { label: 'Falha', variant: 'destructive' },
    };
    const info = map[status] || { label: status, variant: 'outline' as const };
    return <Badge variant={info.variant} className="text-[10px]">{info.label}</Badge>;
  };

  const handleResumeOrder = async (o: any) => {
    if ((o.status === 'configurando' || shouldUseTrackingStep(o.status)) && o.external_order_id) {
      // Check live status from API to determine correct step
      const liveOrder = await lvb.getOrder(o.external_order_id);
      const liveStatus = normalizeOrderStatus(liveOrder?.status || o.status || 'configurando');

      const orderState: OrderState = {
        pedidoId: o.external_order_id,
        creditos: o.creditos,
        linkCliente: liveOrder?.linkCliente || o.link_cliente || '',
        emailBot: liveOrder?.emailConviteBot || o.email_bot || '',
        workspaceName: liveOrder?.workspaceNome || o.workspace_name || '',
        status: liveStatus,
      };
      setOrder(orderState);

      if (shouldUseTrackingStep(liveStatus)) {
        setStep('tracking');
      } else if (liveOrder?.workspaceNome) {
        // Workspace already found, needs Owner promotion
        setStep('promote');
      } else {
        setStep('created');
      }
    } else if (o.status === 'pending_payment' && o.pix_code_text) {
      setPixState({
        orderId: o.id,
        pixCodeText: o.pix_code_text,
        pixQrCode: o.pix_qr_code || '',
        amountCents: o.amount_cents,
        creditos: o.creditos,
      });
      setStep('pix');
    }
  };

  return (
    <div className="space-y-6">
      <AlertDialog open={requirementsOpen} onOpenChange={setRequirementsOpen}>
        <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">🚨 ATENÇÃO — VERIFIQUE OS REQUISITOS ANTES DE CONTINUAR 🚨</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-sm text-foreground/90">
                <p>Contas com determinados planos <strong>Pro</strong> e <strong>Business</strong> são compatíveis com nosso sistema de recarga de créditos.</p>
                <p>Confira abaixo os planos aceitos atualmente:</p>

                <div>
                  <p className="font-semibold mb-2">✅ PLANOS COMPATÍVEIS</p>
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left p-2">Plano da Conta</th>
                          <th className="text-right p-2">Valor Mensal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        <tr><td className="p-2">Plano Free</td><td className="p-2 text-right">Gratuito</td></tr>
                        <tr><td className="p-2">Pro — 20 créditos</td><td className="p-2 text-right">$5/mês</td></tr>
                        <tr><td className="p-2">Pro — 200 créditos</td><td className="p-2 text-right">$50/mês</td></tr>
                        <tr><td className="p-2">Pro — 400 créditos</td><td className="p-2 text-right">$100/mês</td></tr>
                        <tr><td className="p-2">Pro — 800 créditos</td><td className="p-2 text-right">$200/mês</td></tr>
                        <tr><td className="p-2">Pro — 10.000 créditos</td><td className="p-2 text-right">$2.250/mês</td></tr>
                        <tr><td className="p-2">Business — 100 créditos</td><td className="p-2 text-right">$50/mês</td></tr>
                        <tr><td className="p-2">Business — 200 créditos</td><td className="p-2 text-right">$100/mês</td></tr>
                        <tr><td className="p-2">Business — 400 créditos</td><td className="p-2 text-right">$200/mês</td></tr>
                        <tr><td className="p-2">Business — 5.000 créditos</td><td className="p-2 text-right">$2.250/mês</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <p className="font-semibold mb-2">📍 LIMITE DIÁRIO DE RECARGA</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Pro — 20 créditos</strong> → até 200 créditos por dia</li>
                    <li><strong>Pro — 200 créditos ou superior</strong> → até 1.000 créditos por dia</li>
                    <li><strong>Business — qualquer plano</strong> → até 2.000 créditos por dia</li>
                  </ul>
                </div>

                <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3">
                  <p className="font-semibold mb-1">⚠️ IMPORTANTE</p>
                  <p>Pedidos realizados acima do limite diário do seu plano serão entregues automaticamente no dia seguinte, após 24 horas exatas.</p>
                </div>

                <p>Ao continuar, você confirma que leu e concorda com as regras acima.</p>
                <p>Qualquer dúvida, estamos à disposição 🚀</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingPackage(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptRequirements}>Li e concordo, continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PixCustomerDialog
        open={pixCustomerOpen}
        onClose={() => { setPixCustomerOpen(false); setPendingPackage(null); }}
        onConfirm={handlePixCustomerConfirm}
        loading={pixLoading}
        defaultEmail={user?.email || ''}
      />
      {popupBlockedUrl && (
        <Card className="rounded-2xl border-border/50 bg-muted/30">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">O popup foi bloqueado pelo navegador</p>
              <p className="text-xs text-muted-foreground">Abra manualmente o link do cliente ou copie o endereço.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg gap-1"
                onClick={() => window.open(popupBlockedUrl, '_blank', 'noopener,noreferrer')}
              >
                <ExternalLink className="h-3 w-3" /> Abrir manualmente
              </Button>
              <Button variant="outline" size="sm" className="rounded-lg gap-1" onClick={() => copyText(popupBlockedUrl)}>
                <Copy className="h-3 w-3" /> Copiar link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'select' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <img src={coinsIcon} alt="Créditos" className="h-6 w-6 object-contain" />
            <h2 className="text-lg font-bold">Selecionar Pacote de Créditos Lovable</h2>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {packages.map((pkg) => {
              const isPopular = pkg.credits === 1000;
              return isPopular ? (
                <div key={pkg.credits} className="relative col-span-1" style={{ transform: 'scale(1.05)' }}>
                  <style>{`
                    @property --border-angle {
                      syntax: "<angle>";
                      initial-value: 0deg;
                      inherits: false;
                    }
                    .popular-card {
                      position: relative;
                      isolation: isolate;
                      overflow: hidden;
                      border-radius: 1rem;
                      padding: 2px;
                      cursor: pointer;
                      transition: transform 0.2s ease, box-shadow 0.3s ease;
                    }
                    .popular-card:hover {
                      transform: translateY(-2px);
                      box-shadow: 0 8px 40px -8px hsl(var(--primary) / 0.5);
                    }
                    .popular-card:active { transform: translateY(0); }

                    .popular-card-border {
                      position: absolute;
                      inset: 0;
                      border-radius: inherit;
                      background: conic-gradient(
                        from var(--border-angle),
                        hsl(var(--primary)),
                        hsl(var(--primary) / 0.3),
                        hsl(var(--primary) / 0.1),
                        hsl(var(--primary) / 0.3),
                        hsl(var(--primary))
                      );
                      animation: spin-border 3s linear infinite;
                      z-index: 0;
                    }
                    .popular-card-border::after {
                      content: "";
                      position: absolute;
                      inset: 0;
                      border-radius: inherit;
                      background: conic-gradient(
                        from var(--border-angle),
                        hsl(var(--primary)),
                        hsl(var(--primary) / 0.3),
                        hsl(var(--primary) / 0.1),
                        hsl(var(--primary) / 0.3),
                        hsl(var(--primary))
                      );
                      filter: blur(10px);
                      opacity: 0.5;
                    }

                    .popular-card-inner {
                      position: relative;
                      z-index: 1;
                      border-radius: calc(1rem - 2px);
                      background: hsl(var(--card));
                      overflow: hidden;
                    }
                    .popular-card-inner::before {
                      content: "";
                      position: absolute;
                      inset: 0;
                      background: radial-gradient(
                        ellipse at 50% 0%,
                        hsl(var(--primary) / 0.15) 0%,
                        transparent 60%
                      );
                      pointer-events: none;
                    }
                    .popular-card-inner::after {
                      content: "";
                      position: absolute;
                      top: -50%;
                      left: -50%;
                      width: 200%;
                      height: 200%;
                      background: conic-gradient(
                        from 0deg,
                        transparent 0%,
                        hsl(var(--primary) / 0.04) 25%,
                        transparent 50%
                      );
                      animation: spin-inner-glow 4s linear infinite;
                      pointer-events: none;
                    }

                    @keyframes spin-border {
                      to { --border-angle: 360deg; }
                    }
                    @keyframes spin-inner-glow {
                      to { transform: rotate(360deg); }
                    }
                    .popular-pulse {
                      animation: popular-pulse-glow 2s ease-in-out infinite;
                    }
                    @keyframes popular-pulse-glow {
                      0%, 100% { box-shadow: 0 0 15px -3px hsl(var(--primary) / 0.3); }
                      50% { box-shadow: 0 0 25px -3px hsl(var(--primary) / 0.5); }
                    }
                  `}</style>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                    <span className="bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap shadow-lg shadow-primary/40 flex items-center gap-1">
                      <span className="inline-block animate-pulse">🔥</span> Mais pedido
                    </span>
                  </div>
                  <div
                    className="popular-card popular-pulse"
                    onClick={() => !pixLoading && handleSelectPackage(pkg)}
                  >
                    <div className="popular-card-border" />
                    <div className="popular-card-inner">
                      <div className="p-5 text-center space-y-2 relative z-[2]">
                        <div className="h-11 w-11 rounded-xl flex items-center justify-center mx-auto">
                          <img src={coinsIcon} alt="Créditos" className="h-[52px] w-[52px] object-contain" />
                        </div>
                        <p className="text-3xl font-black text-foreground">{pkg.credits}</p>
                        <p className="text-[11px] text-muted-foreground font-medium">créditos</p>
                        <p className="text-base font-bold text-primary">R$ {pkg.price.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
              <Card
                key={pkg.credits}
                className="rounded-2xl transition-all cursor-pointer group hover:shadow-lg relative border-border/50 hover:border-primary/40 hover:shadow-primary/10"
                onClick={() => !pixLoading && handleSelectPackage(pkg)}
              >
                <CardContent className="p-4 text-center space-y-2">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center mx-auto">
                    <img src={coinsIcon} alt="Créditos" className="h-[46px] w-[46px] object-contain" />
                  </div>
                  <p className="text-2xl font-black text-foreground">{pkg.credits}</p>
                  <p className="text-[11px] text-muted-foreground">créditos</p>
                  <p className="text-sm font-bold text-primary">R$ {pkg.price.toFixed(2)}</p>
                </CardContent>
              </Card>
              );
            })}
          </div>
          {pixLoading && (
            <div className="flex items-center justify-center gap-2 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Gerando QR Code PIX...</span>
            </div>
          )}
        </div>
      )}

      <Dialog open={step === 'pix' && !!pixState} onOpenChange={(o) => { if (!o) resetWizard(); }}>
        <DialogContent className="max-w-md rounded-2xl border-primary/30">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-primary">
              <QrCode className="h-5 w-5" />
              Pague via PIX
            </DialogTitle>
          </DialogHeader>
          {pixState && (
            <div className="text-center space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Créditos</span>
                <span className="font-bold">{pixState.creditos}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-bold text-primary">R$ {(pixState.amountCents / 100).toFixed(2)}</span>
              </div>

              {(pixState.pixQrCode || pixState.pixCodeText) && (
                <div className="flex justify-center">
                  <PixQrCode value={pixState.pixCodeText} imageUrl={pixState.pixQrCode} alt="QR Code PIX" />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Ou copie o código PIX:</p>
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-3 py-2 rounded-lg text-[10px] font-mono flex-1 break-all max-h-20 overflow-y-auto text-left">
                    {pixState.pixCodeText}
                  </code>
                  <Button variant="outline" size="icon" className="shrink-0" onClick={() => copyText(pixState.pixCodeText)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Aguardando confirmação do pagamento...
              </div>

              <Button variant="ghost" onClick={resetWizard} className="w-full rounded-xl">
                Cancelar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>


      {step === 'created' && order && (
        <Card className="rounded-2xl border-primary/30 bg-primary/5">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" />
              <h2 className="text-lg font-bold">Pagamento Confirmado!</h2>
            </div>
            <div className="grid gap-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Créditos</span><span className="font-bold">{order.creditos}</span></div>
              {order.linkCliente && (
                <div className="flex justify-between items-center gap-3">
                  <span className="text-muted-foreground">Link do Cliente</span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => openCustomerPopup(order.linkCliente)}>
                      <ExternalLink className="h-3 w-3" /> Abrir
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => copyText(order.linkCliente)}>
                      <Copy className="h-3 w-3" /> Copiar
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="h-px bg-border/50 my-2" />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Próximo passo: Convidar o Bot
              </h3>
              <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                <p>O cliente deve convidar o seguinte email no workspace Lovable dele:</p>
                <div className="flex items-center gap-2">
                  {order.emailBot ? (
                    <code className="bg-background px-3 py-1.5 rounded-lg text-xs font-mono flex-1 break-all">{order.emailBot}</code>
                  ) : (
                    <div className="bg-background px-3 py-1.5 rounded-lg flex-1 flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground animate-pulse">Gerando email do bot...</span>
                    </div>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={!order.emailBot} onClick={() => copyText(order.emailBot)}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-muted-foreground text-xs">Qualquer permissão serve neste momento (viewer, editor, admin).</p>
              </div>
              <Button onClick={handleConfirmInvite} disabled={confirmingInvite || lvb.loading} className="w-full rounded-xl">
                {confirmingInvite ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verificando convite...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Confirmar Convite
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'promote' && order && (
        <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2 text-amber-500">
              <ShieldCheck className="h-5 w-5" />
              <h2 className="text-lg font-bold">Promover Bot a Owner</h2>
            </div>
            {order.workspaceName && (
              <p className="text-sm text-muted-foreground">
                Workspace encontrado: <span className="font-semibold text-foreground">{order.workspaceName}</span>
              </p>
            )}
            <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
              <p className="font-medium">O cliente deve:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Atualizar a página do workspace no Lovable</li>
                <li>Localizar o bot na lista de membros</li>
                <li>Alterar a Role para <span className="font-bold text-foreground">Owner</span></li>
              </ol>
            </div>
            <Button onClick={handleConfirmPromotion} disabled={confirmingPromotion || lvb.loading} className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-white">
              {confirmingPromotion ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando permissão...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Confirmar Acesso Owner
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'tracking' && order && (
        <Card className="rounded-2xl border-primary/30">
          <CardContent className="p-6 space-y-4">
            {isSuccessStatus(order.status) ? (
              <>
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
                    <CheckCircle2 className="h-9 w-9 text-success" />
                  </div>
                  <h2 className="text-lg font-bold">Créditos Entregues com Sucesso!</h2>
                  <p className="text-sm text-muted-foreground text-center">
                    <span className="font-bold text-foreground">{order.creditos}</span> créditos foram adicionados ao workspace <span className="font-bold text-foreground">{order.workspaceName || 'do cliente'}</span>.
                  </p>
                </div>
                <Progress value={100} className="h-2" />
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm space-y-1">
                   <p className="font-bold text-amber-400 flex items-center gap-2">
                     <ShieldCheck className="h-4 w-4" /> Importante
                   </p>
                   <p className="text-muted-foreground">
                     Remova a conta do bot da lista de membros do workspace para manter a segurança.
                   </p>
                 </div>
                 <Button onClick={resetWizard} className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white gap-2">
                   <CheckCircle2 className="h-4 w-4" />
                   Pedido Entregue — Confirmar e Finalizar
                 </Button>
              </>
            ) : order.status === 'falha' ? (
              <>
                <div className="flex flex-col items-center gap-3 py-4">
                  <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
                    <Clock className="h-9 w-9 text-destructive" />
                  </div>
                  <h2 className="text-lg font-bold">Falha na Entrega</h2>
                  <p className="text-sm text-muted-foreground text-center">Houve um erro ao entregar os créditos. Entre em contato com o suporte.</p>
                </div>
                <Progress value={100} className="h-2 [&>div]:bg-destructive" />
                <Button onClick={resetWizard} className="w-full rounded-xl">
                  Novo Pedido
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary animate-pulse" />
                  <h2 className="text-lg font-bold">Acompanhamento do Pedido</h2>
                </div>
                <div className="grid gap-3 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Créditos</span><span className="font-bold">{order.creditos}</span></div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    {statusBadge(order.status)}
                  </div>
                  {order.workspaceName && (
                    <div className="flex justify-between"><span className="text-muted-foreground">Workspace</span><span className="font-medium">{order.workspaceName}</span></div>
                  )}
                </div>
                <div className="space-y-2">
                  <Progress value={order.status === 'recarregando' ? 65 : order.status === 'configurando' ? 35 : 15} className="h-2 animate-pulse" />
                  <p className="text-[11px] text-muted-foreground text-center">
                    {order.status === 'recarregando' ? 'Entregando créditos...' : 'Preparando entrega...'}
                  </p>
                </div>
                {polling && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Verificando a cada 15 segundos...
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vídeo tutorial */}
      <Card className="rounded-2xl border-border/50 overflow-hidden">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎬</span>
            <span className="text-sm font-semibold">Vídeo Tutorial: Como comprar créditos</span>
          </div>
          <div className="rounded-xl overflow-hidden border border-border/50 bg-black aspect-video">
            <iframe
              src="https://player.cloudinary.com/embed/?cloud_name=dvln7ny9l&public_id=TUTORIAL_CREDITOS_ezng06"
              className="w-full h-full"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Vídeo Tutorial: Como comprar créditos"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tutorial completo do fluxo */}
      <Card className="rounded-2xl border-border/50 overflow-hidden">
        <CardContent className="p-0">
          <button
            onClick={() => setShowTutorial(!showTutorial)}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Como funciona a entrega de créditos</span>
            </div>
            {showTutorial ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {showTutorial && (
            <div className="px-4 pb-5 space-y-5 animate-fade-in">
              <p className="text-xs text-muted-foreground">Guia completo do fluxo de entrega de créditos Lovable</p>

              {/* Fluxo completo em texto */}
              <div className="space-y-4">
                {[
                  {
                    num: 1,
                    title: 'Selecione o pacote e pague via PIX',
                    desc: 'Escolha a quantidade de créditos desejada. Um QR Code PIX será gerado automaticamente. Após o pagamento, o sistema detecta e avança para o próximo passo.',
                  },
                  {
                    num: 2,
                    title: 'Convide o bot para o Workspace do cliente',
                    desc: 'Um email do bot será gerado. O cliente deve ir em Settings > People > Invite members no Lovable e convidar esse email com qualquer permissão (Editor está OK).',
                  },
                  {
                    num: 3,
                    title: 'Confirme o convite no sistema',
                    desc: 'Após o cliente enviar o convite, clique em "Confirmar Convite" no painel. O sistema verificará se o bot foi adicionado ao workspace.',
                  },
                  {
                    num: 4,
                    title: 'Promova o bot para Owner',
                    desc: 'O cliente deve ir novamente em Settings > People, localizar a conta do bot na lista de membros e alterar a Role para Owner. Isso é necessário para que o bot consiga adicionar os créditos.',
                  },
                  {
                    num: 5,
                    title: 'Confirme o acesso Owner',
                    desc: 'Clique em "Confirmar Acesso Owner". O sistema verificará se o bot tem permissão de Owner e iniciará a entrega dos créditos automaticamente.',
                  },
                  {
                    num: 6,
                    title: 'Aguarde a entrega e remova o bot',
                    desc: 'O sistema entregará os créditos ao workspace. Acompanhe a barra de progresso. Após a conclusão, remova a conta do bot da lista de membros do workspace para manter a segurança.',
                  },
                ].map((item) => (
                  <div key={item.num} className="flex gap-3">
                    <div className="shrink-0 w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">{item.num}</span>
                    </div>
                    <div className="space-y-0.5 pt-0.5">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tutorial visual de convite */}
              <div className="border-t border-border/30 pt-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tutorial visual: Como convidar no Lovable</p>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3].map((s) => (
                    <button
                      key={s}
                      onClick={() => setTutorialStep(s)}
                      className={`w-8 h-8 rounded-full text-xs font-bold transition-all ${
                        tutorialStep === s
                          ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="rounded-xl overflow-hidden border border-border/50">
                  <img
                    src={tutorialStep === 1 ? tutorialStep1 : tutorialStep === 2 ? tutorialStep2 : tutorialStep3}
                    alt={`Passo ${tutorialStep}`}
                    className="w-full object-contain max-h-[300px] bg-background"
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-sm font-semibold">
                    {tutorialStep === 1 && 'Passo 1: Abrir configurações do Workspace'}
                    {tutorialStep === 2 && 'Passo 2: Acessar Settings > Invite members'}
                    {tutorialStep === 3 && 'Passo 3: Colar o email e convidar'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tutorialStep === 1 && 'Clique no nome do seu workspace no menu lateral esquerdo (onde está a seta vermelha)'}
                    {tutorialStep === 2 && 'Clique em "Settings" e depois em "Invite members" para abrir o modal de convite'}
                    {tutorialStep === 3 && 'Cole o email do bot no campo de Email, selecione qualquer Role (Editor) e clique em "Invite"'}
                  </p>
                </div>
                <div className="flex justify-between">
                  <Button variant="ghost" size="sm" className="rounded-lg" disabled={tutorialStep === 1} onClick={() => setTutorialStep((s) => Math.max(1, s - 1))}>Anterior</Button>
                  <Button variant="ghost" size="sm" className="rounded-lg" disabled={tutorialStep === 3} onClick={() => setTutorialStep((s) => Math.min(3, s + 1))}>Próximo</Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {orders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Histórico de Pedidos</h2>
          <Card className="rounded-2xl border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Data</TableHead>
                  <TableHead className="text-xs">Créditos</TableHead>
                  <TableHead className="text-xs">Valor</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {orders.map((o) => (
                   <TableRow key={o.id}>
                     <TableCell className="text-xs">{format(new Date(o.created_at), 'dd/MM/yy HH:mm', { locale: ptBR })}</TableCell>
                     <TableCell className="text-xs font-bold">{o.creditos}</TableCell>
                     <TableCell className="text-xs">R$ {(o.amount_cents / 100).toFixed(2)}</TableCell>
                     <TableCell>{statusBadge(o.status)}</TableCell>
                   </TableRow>
                 ))}
               </TableBody>
            </Table>
          </Card>
        </div>
      )}
    </div>
  );
}
