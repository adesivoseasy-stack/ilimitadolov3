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

  const createOrder = useCallback(async (quantity: number, customer: PixCustomerData, promo?: boolean, lifetime?: boolean, combo?: boolean, comboChampion?: boolean, renewal?: { licenseId: string }, comboAccount?: boolean, manusCredits?: boolean, lifetimeBulk?: boolean, geminiPro?: boolean, seedanceAccount?: boolean): Promise<PixOrderData | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('create-pix-order', {
        body: { quantity, ...customer, ...(promo ? { promo: true } : {}), ...(lifetime ? { lifetime: true } : {}), ...(lifetimeBulk ? { lifetimeBulk: true } : {}), ...(combo ? { combo: true } : {}), ...(comboChampion ? { comboChampion: true } : {}), ...(comboAccount ? { comboAccount: true } : {}), ...(manusCredits ? { manusCredits: true } : {}), ...(geminiPro ? { geminiPro: true } : {}), ...(seedanceAccount ? { seedanceAccount: true } : {}), ...(renewal ? { renewal: true, licenseId: renewal.licenseId } : {}) },
      });
      if (fnError) throw fnError;
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

  useEffect(() => {
    if (!orderId) return;

    const interval = setInterval(async () => {
      const { data, error } = await supabase
        .from('credit_orders' as any)
        .select('status')
        .eq('id', orderId)
        .single();

      if (!error && data) {
        const orderStatus = (data as any).status;
        setStatus(orderStatus);
        if (orderStatus === 'paid') {
          clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: ['reseller-credits'] });
          queryClient.invalidateQueries({ queryKey: ['reseller-licenses'] });
          queryClient.invalidateQueries({ queryKey: ['reseller-stats'] });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [orderId, queryClient]);

  return status;
}
