import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

export interface PixOrderData {
  order_id: string;
  qr_code_text: string;
  qr_code_image_url: string;
  amount_cents: number;
  quantity: number;
  price_per_key: number;
}

export interface PixCustomerData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string;
}

export function useCreatePixOrder() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createOrder = useCallback(async (quantity: number, customer: PixCustomerData, promo?: boolean, lifetime?: boolean, combo?: boolean, comboChampion?: boolean, renewal?: { licenseId: string }, comboAccount?: boolean, manusCredits?: boolean, lifetimeBulk?: boolean, geminiPro?: boolean, seedanceAccount?: boolean, capcutPro?: boolean, lovableAccount?: boolean): Promise<PixOrderData | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      let accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        accessToken = refreshed.session?.access_token;
      }
      if (!accessToken) {
        throw new Error('Sessão expirada. Faça login novamente para gerar o PIX.');
      }

      const { data, error: fnError } = await supabase.functions.invoke('create-pix-order', {
        headers: { Authorization: `Bearer ${accessToken}` },
        body: { quantity, ...customer, ...(promo ? { promo: true } : {}), ...(lifetime ? { lifetime: true } : {}), ...(lifetimeBulk ? { lifetimeBulk: true } : {}), ...(combo ? { combo: true } : {}), ...(comboChampion ? { comboChampion: true } : {}), ...(comboAccount ? { comboAccount: true } : {}), ...(manusCredits ? { manusCredits: true } : {}), ...(geminiPro ? { geminiPro: true } : {}), ...(seedanceAccount ? { seedanceAccount: true } : {}), ...(capcutPro ? { capcutPro: true } : {}), ...(lovableAccount ? { lovableAccount: true } : {}), ...(renewal ? { renewal: true, licenseId: renewal.licenseId } : {}) },
      });
      if (fnError) {
        const ctx = (fnError as any)?.context;
        if (ctx && typeof ctx.json === 'function') {
          try {
            const body = await ctx.json();
            if (body?.error) throw new Error(body.error);
          } catch (parseErr: any) {
            if (parseErr instanceof Error && parseErr.message && !/json/i.test(parseErr.message)) throw parseErr;
          }
        }
        throw fnError;
      }
      if (data?.error) throw new Error(data.error);
      return data as PixOrderData;
    } catch (err: any) {
      setError(err.message || 'Erro ao criar pedido PIX');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createOrder, isLoading, error };
}

export function usePixOrderPolling(orderId: string | null) {
  const [status, setStatus] = useState<string>('pending');
  const queryClient = useQueryClient();

  const handlePaid = useCallback(() => {
    setStatus('paid');
    queryClient.invalidateQueries({ queryKey: ['reseller-credits'] });
    queryClient.invalidateQueries({ queryKey: ['reseller-licenses'] });
    queryClient.invalidateQueries({ queryKey: ['reseller-stats'] });
  }, [queryClient]);

  useEffect(() => {
    if (!orderId) return;

    // Reset status on new order
    setStatus('pending');

    // ── Immediate check (payment may have happened before component mounted) ──
    const checkNow = async () => {
      const { data, error } = await supabase
        .from('credit_orders' as any)
        .select('status')
        .eq('id', orderId)
        .maybeSingle();
      if (!error && data && (data as any).status === 'paid') {
        handlePaid();
        return true;
      }
      return false;
    };

    let intervalId: ReturnType<typeof setInterval> | null = null;
    let realtimeSub: any = null;
    let stopped = false;

    const startPolling = () => {
      if (stopped) return;
      intervalId = setInterval(async () => {
        const { data, error } = await supabase
          .from('credit_orders' as any)
          .select('status')
          .eq('id', orderId)
          .maybeSingle();
        if (!error && data) {
          const s = (data as any).status;
          if (s && s !== 'pending') setStatus(s);
          if (s === 'paid') {
            handlePaid();
            if (intervalId) clearInterval(intervalId);
          }
        }
      }, 4000);
    };

    // ── Realtime subscription (instant notification) ──
    realtimeSub = supabase
      .channel(`credit_order_${orderId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'credit_orders',
          filter: `id=eq.${orderId}`,
        },
        (payload: any) => {
          const newStatus = payload?.new?.status;
          if (newStatus) setStatus(newStatus);
          if (newStatus === 'paid') {
            handlePaid();
            if (intervalId) clearInterval(intervalId);
          }
        }
      )
      .subscribe();

    // Run immediate check then start polling as fallback
    checkNow().then((alreadyPaid) => {
      if (!alreadyPaid && !stopped) startPolling();
    });

    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
      if (realtimeSub) supabase.removeChannel(realtimeSub);
    };
  }, [orderId, handlePaid]);

  return status;
}

