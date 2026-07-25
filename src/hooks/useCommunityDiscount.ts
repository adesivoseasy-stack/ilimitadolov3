import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import confetti from 'canvas-confetti';

export interface DiscountLevel {
  id: string;
  name: string;
  emoji: string;
  sales_required: number;
  discount_percentage: number;
  order_index: number;
}

export interface ResellerProgress {
  reseller_id: string;
  current_sales: number;
  current_level_id: string | null;
  current_discount: number;
  next_level_id: string | null;
  sales_to_next: number | null;
  updated_at: string;
}

export interface CommunityDiscountState {
  isActive: boolean;
  levels: DiscountLevel[];
  progress: ResellerProgress | null;
  currentLevel: DiscountLevel | null;
  nextLevel: DiscountLevel | null;
  discountPct: number;
  currentSales: number;
  salesToNext: number | null;
  progressPct: number;
  applyDiscount: (price: number) => number;
  hasDiscount: boolean;
}

function fireConfetti() {
  const colors = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#ffffff'];
  confetti({ particleCount: 120, spread: 90, origin: { y: 0.35 }, colors });
  setTimeout(() => confetti({ particleCount: 60, spread: 120, origin: { y: 0.4 }, colors }), 220);
}

export function useCommunityDiscount(): CommunityDiscountState {
  const { user } = useAuth();
  const qc = useQueryClient();
  const lastLevelIdRef = useRef<string | null | undefined>(undefined);

  const { data: levels = [] } = useQuery({
    queryKey: ['community-discount-levels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_discount_levels' as any)
        .select('*')
        .order('order_index', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as DiscountLevel[];
    },
    staleTime: 60_000,
  });

  const { data: config } = useQuery({
    queryKey: ['community-discount-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_discount_config' as any)
        .select('is_active')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? { is_active: true }) as { is_active: boolean };
    },
    staleTime: 60_000,
  });

  const { data: progress } = useQuery({
    queryKey: ['community-discount-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('reseller_community_progress' as any)
        .select('*')
        .eq('reseller_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ResellerProgress | null;
    },
    enabled: !!user?.id,
    staleTime: 15_000,
  });

  // Realtime subscription — invalidates on any change to my progress row
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`community-progress-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reseller_community_progress', filter: `reseller_id=eq.${user.id}` },
        () => {
          qc.invalidateQueries({ queryKey: ['community-discount-progress', user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, qc]);

  // Level-up detection → confetti
  useEffect(() => {
    const cur = progress?.current_level_id ?? null;
    if (lastLevelIdRef.current === undefined) {
      lastLevelIdRef.current = cur;
      return;
    }
    if (cur && cur !== lastLevelIdRef.current) {
      fireConfetti();
    }
    lastLevelIdRef.current = cur;
  }, [progress?.current_level_id]);

  const isActive = config?.is_active ?? true;
  const currentLevel = levels.find(l => l.id === progress?.current_level_id) ?? null;
  const nextLevel = levels.find(l => l.id === progress?.next_level_id) ?? levels[0] ?? null;
  const discountPct = isActive ? Number(progress?.current_discount ?? 0) : 0;
  const currentSales = progress?.current_sales ?? 0;
  const salesToNext = progress?.sales_to_next ?? null;

  // Progress percentage on the whole track (0 → last level target)
  const maxRequired = levels.length > 0 ? levels[levels.length - 1].sales_required : 0;
  const progressPct = maxRequired > 0
    ? Math.min(100, (currentSales / maxRequired) * 100)
    : 0;

  const applyDiscount = (price: number) => {
    if (!isActive || discountPct <= 0) return price;
    return Math.round(price * (1 - discountPct / 100) * 100) / 100;
  };

  return {
    isActive,
    levels,
    progress: progress ?? null,
    currentLevel,
    nextLevel: currentLevel && nextLevel?.id === currentLevel.id ? null : nextLevel,
    discountPct,
    currentSales,
    salesToNext,
    progressPct,
    applyDiscount,
    hasDiscount: isActive && discountPct > 0,
  };
}