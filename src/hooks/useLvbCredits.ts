import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

async function callLvb(action: string, params: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke('lvb-credits', {
    body: { action, ...params },
  });
  if (error) throw new Error(error.message || 'Erro na requisição');
  return data;
}

export function useLvbCredits() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getBalance = useCallback(async () => {
    try {
      const res = await callLvb('get-balance');
      return res;
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return null;
    }
  }, [toast]);

  // createOrder and setDelivery removed — these are now handled exclusively
  // by the syncpay-webhook after payment confirmation (server-side only)


  const confirmInvite = useCallback(async (pedidoId: string) => {
    setLoading(true);
    try {
      const res = await callLvb('confirm-invite', { pedidoId });
      if (!res?.success) throw new Error(res?.message || 'Erro ao confirmar convite');
      return res.data;
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const getAction = useCallback(async (pedidoId: string, acaoId: string) => {
    try {
      const res = await callLvb('get-action', { pedidoId, acaoId });
      if (!res?.success) throw new Error(res?.message || 'Erro ao consultar ação');
      return res.data;
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return null;
    }
  }, [toast]);

  const getOrder = useCallback(async (pedidoId: string) => {
    try {
      const res = await callLvb('get-order', { pedidoId });
      if (!res?.success) throw new Error(res?.message || 'Erro ao consultar pedido');
      return res.data;
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
      return null;
    }
  }, [toast]);

  return { loading, getBalance, confirmInvite, getAction, getOrder };
}
