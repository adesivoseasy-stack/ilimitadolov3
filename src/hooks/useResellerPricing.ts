import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface KeyTier {
  quantity: number;
  pricePerKey: number;
}

export type PlanType = '197' | '297' | '997';

const DEFAULT_TIERS: Record<PlanType, KeyTier[]> = {
  '197': [
    { quantity: 1, pricePerKey: 34.90 },
    { quantity: 2, pricePerKey: 34.90 },
    { quantity: 3, pricePerKey: 34.90 },
  ],
  '297': [
    { quantity: 1, pricePerKey: 34.90 },
    { quantity: 2, pricePerKey: 34.90 },
    { quantity: 3, pricePerKey: 34.90 },
  ],
  '997': [],
};

export function useResellerPricing(planType: PlanType = '197') {
  return useQuery({
    queryKey: ['reseller-pricing', planType],
    queryFn: async () => {
      // Plan 997 = unlimited, no pricing tiers
      if (planType === '997') return [];

      const prefix = `reseller_key_tier_${planType}_`;
      const { data, error } = await supabase
        .from('system_config')
        .select('key, value')
        .like('key', `${prefix}%`);

      if (error) throw error;

      const configMap = new Map((data || []).map(c => [c.key, c.value]));

      const tiers: KeyTier[] = [];
      for (let i = 1; i <= 10; i++) {
        const qty = configMap.get(`${prefix}${i}_qty`);
        const price = configMap.get(`${prefix}${i}_price`);
        if (qty && price) {
          tiers.push({
            quantity: parseInt(qty),
            pricePerKey: parseFloat(price),
          });
        }
      }

      // Default tiers if none configured
      if (tiers.length === 0) {
        return DEFAULT_TIERS[planType] || DEFAULT_TIERS['197'];
      }

      return tiers.sort((a, b) => a.quantity - b.quantity);
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useResellerPlanType() {
  const { user, isLoading } = useAuth();

  return useQuery({
    queryKey: ['reseller-plan-type', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('reseller_profiles')
        .select('plan_type, custom_key_price')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      return {
        planType: (data?.plan_type as PlanType) || '197',
        customKeyPrice: data?.custom_key_price ? Number(data.custom_key_price) : null,
      };
    },
    placeholderData: (previousData) => previousData,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
    enabled: !isLoading && !!user,
  });
}
