import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ResellerWithCredits {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  phone: string | null;
  status: string;
  created_at: string;
  credits_total: number;
  credits_used: number;
  license_count: number;
}

export function useManagerResellers() {
  return useQuery({
    queryKey: ['manager-resellers'],
    queryFn: async () => {
      const [profilesRes, creditsRes, licensesRes] = await Promise.all([
        supabase
          .from('reseller_profiles')
          .select('id,user_id,name,company,phone,status,created_at')
          .eq('status', 'approved')
          .order('created_at', { ascending: false }),
        supabase
          .from('reseller_credits')
          .select('reseller_id,credits_total,credits_used'),
        supabase
          .from('licenses')
          .select('created_by'),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (creditsRes.error) throw creditsRes.error;
      if (licensesRes.error) throw licensesRes.error;

      const creditMap = new Map(creditsRes.data?.map(c => [c.reseller_id, c]) || []);
      const licenseCountMap = new Map<string, number>();
      licensesRes.data?.forEach(l => {
        if (l.created_by) {
          licenseCountMap.set(l.created_by, (licenseCountMap.get(l.created_by) || 0) + 1);
        }
      });

      return (profilesRes.data || []).map(p => ({
        ...p,
        credits_total: creditMap.get(p.user_id)?.credits_total || 0,
        credits_used: creditMap.get(p.user_id)?.credits_used || 0,
        license_count: licenseCountMap.get(p.user_id) || 0,
      })) as ResellerWithCredits[];
    },
    staleTime: 30_000,
  });
}

export function useManagerStats() {
  return useQuery({
    queryKey: ['manager-stats'],
    queryFn: async () => {
      const [profilesRes, creditsRes] = await Promise.all([
        supabase.from('reseller_profiles').select('status'),
        supabase.from('reseller_credits').select('credits_total,credits_used'),
      ]);

      const profiles = profilesRes.data;
      const credits = creditsRes.data;
      const totalCredits = credits?.reduce((sum, c) => sum + c.credits_total, 0) || 0;
      const usedCredits = credits?.reduce((sum, c) => sum + c.credits_used, 0) || 0;

      return {
        totalResellers: profiles?.filter(p => p.status === 'approved').length || 0,
        pendingResellers: profiles?.filter(p => p.status === 'pending').length || 0,
        totalCredits,
        usedCredits,
        availableCredits: totalCredits - usedCredits,
      };
    },
    staleTime: 30_000,
  });
}

export function useAddCredits() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ resellerId, amount, lifetime, customDurationDays }: { resellerId: string; amount: number; lifetime?: boolean; customDurationDays?: number | null }) => {
      // Check if credits row exists
      const { data: existing } = await supabase
        .from('reseller_credits')
        .select('id, credits_total, lifetime_credits_total')
        .eq('reseller_id', resellerId)
        .maybeSingle() as any;

      if (existing) {
        const update: any = { updated_at: new Date().toISOString() };
        if (lifetime) {
          update.lifetime_credits_total = (existing.lifetime_credits_total || 0) + amount;
        } else {
          update.credits_total = existing.credits_total + amount;
        }
        if (customDurationDays != null) {
          update.custom_duration_days = customDurationDays;
        }
        const { error } = await supabase
          .from('reseller_credits')
          .update(update)
          .eq('reseller_id', resellerId);
        if (error) throw error;
      } else {
        const insert: any = { reseller_id: resellerId };
        if (lifetime) insert.lifetime_credits_total = amount;
        else insert.credits_total = amount;
        if (customDurationDays != null) insert.custom_duration_days = customDurationDays;
        const { error } = await supabase
          .from('reseller_credits')
          .insert(insert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-resellers'] });
      queryClient.invalidateQueries({ queryKey: ['manager-stats'] });
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      queryClient.invalidateQueries({ queryKey: ['reseller-credits'] });
      toast({ title: 'Créditos adicionados', description: 'Os créditos foram adicionados com sucesso.' });
    },
    onError: (err: any) => {
      console.error("ADD CREDITS ERROR:", err);
      toast({ title: 'Erro', description: `Não foi possível adicionar créditos: ${err.message || JSON.stringify(err)}`, variant: 'destructive' });
    },
  });
}

export function useSetCredits() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ resellerId, total }: { resellerId: string; total: number }) => {
      const { data: existing } = await supabase
        .from('reseller_credits')
        .select('id')
        .eq('reseller_id', resellerId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('reseller_credits')
          .update({ credits_total: total, updated_at: new Date().toISOString() })
          .eq('reseller_id', resellerId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reseller_credits')
          .insert({ reseller_id: resellerId, credits_total: total });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-resellers'] });
      queryClient.invalidateQueries({ queryKey: ['manager-stats'] });
      toast({ title: 'Créditos atualizados', description: 'O total de créditos foi atualizado.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível atualizar créditos.', variant: 'destructive' });
    },
  });
}

export function useResellerCredits(resellerId: string | undefined) {
  return useQuery({
    queryKey: ['reseller-credits', resellerId],
    queryFn: async () => {
      if (!resellerId) return { credits_total: 0, credits_used: 0, lifetime_credits_total: 0, lifetime_credits_used: 0 };
      const { data, error } = await supabase
        .from('reseller_credits')
        .select('credits_total, credits_used, lifetime_credits_total, lifetime_credits_used')
        .eq('reseller_id', resellerId)
        .maybeSingle();
      if (error) throw error;
      return (data as any) || { credits_total: 0, credits_used: 0, lifetime_credits_total: 0, lifetime_credits_used: 0 };
    },
    enabled: !!resellerId,
  });
}
