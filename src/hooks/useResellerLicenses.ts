import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { LicenseWithDevice, Device } from '@/hooks/useLicenses';

function normalizeDevices(devices: Device | Device[] | null | undefined): Device[] {
  if (!devices) return [];
  if (Array.isArray(devices)) return devices;
  return [devices];
}

export function useResellerLicenses() {
  const { user, isLoading: isAuthLoading, isReseller } = useAuth();

  return useQuery({
    queryKey: ['reseller-licenses', user?.id],
    queryFn: async () => {
      if (!user || !isReseller) return [];
      // Fire-and-forget: don't block the main query
      supabase.rpc('update_expired_licenses').then(() => {});
      // Paginate to bypass default 1000-row cap
      const PAGE_SIZE = 1000;
      const all: any[] = [];
      let from = 0;
      for (let i = 0; i < 50; i++) {
        const { data, error } = await supabase
          .from('licenses')
          .select('*, devices (*)')
          .eq('created_by', user.id)
          .order('created_at', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        const page = data || [];
        if (page.length === 0) break;
        all.push(...page);
        if (page.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return all.map((license: any) => ({
        ...license,
        devices: normalizeDevices(license.devices),
      })) as LicenseWithDevice[];
    },
    enabled: !isAuthLoading && !!user && isReseller,
    staleTime: 15_000,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useResellerStats() {
  const { user, isLoading: isAuthLoading, isReseller } = useAuth();

  return useQuery({
    queryKey: ['reseller-stats', user?.id],
    queryFn: async () => {
      if (!user || !isReseller) return { total: 0, active: 0, expired: 0, revoked: 0, revenue: 0 };
      const { data, error } = await supabase
        .from('licenses')
        .select('status, price')
        .eq('created_by', user.id);
      if (error) throw error;
      return {
        total: data?.length || 0,
        active: data?.filter(l => l.status === 'active').length || 0,
        expired: data?.filter(l => l.status === 'expired').length || 0,
        revoked: data?.filter(l => l.status === 'revoked').length || 0,
        revenue: data?.reduce((sum, l) => sum + (Number(l.price) || 0), 0) || 0,
      };
    },
    enabled: !isAuthLoading && !!user && isReseller,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });
}

export function useResellerCreateLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ email, durationDays, price, notes, isTestLicense, isWildcard, isLifetime, customerName }: {
      email: string;
      durationDays: number;
      price?: number;
      notes?: string;
      isTestLicense?: boolean;
      isWildcard?: boolean;
      isLifetime?: boolean;
      customerName?: string;
    }) => {
      // Test licenses are FREE and unlimited - no credit consumption
      if (!isTestLicense) {
        // Check if reseller is on plan 997 (unlimited)
        const { data: profile } = await supabase
          .from('reseller_profiles')
          .select('plan_type')
          .eq('user_id', user?.id)
          .single();

        const isUnlimited = profile?.plan_type === '997';

        if (!isUnlimited) {
          // Lifetime keys consume from the lifetime credit pool; regular keys from the standard pool.
          if (isLifetime) {
            const { data: hasCredit, error: creditError } = await supabase.rpc(
              'use_reseller_lifetime_credit' as any,
              { _reseller_id: user?.id } as any,
            );
            if (creditError) throw creditError;
            if (!hasCredit) {
              throw new Error('Sem créditos vitalícios disponíveis. Solicite ao administrador.');
            }
          } else {
            const { data: hasCredit, error: creditError } = await supabase.rpc('use_reseller_credit', { _reseller_id: user?.id });
            if (creditError) throw creditError;
            if (!hasCredit) {
              throw new Error('Sem créditos disponíveis. Solicite mais créditos ao gerente.');
            }
          }
        }
      }

      const { data: keyData, error: keyError } = await supabase.rpc('generate_license_key');
      if (keyError) throw keyError;
      const rawKey = keyData as string;
      const shortTestKey = rawKey.split('-').slice(0, 3).join('-');
      const licenseKey = isTestLicense ? `TESTE-${shortTestKey}` : rawKey;

      // Chaves pagas: mensais (30 dias) por padrão. Vitalícia/Wildcard: 100 anos.
      const isLifetimeKey = isLifetime || isWildcard;
      const effectiveDurationDays = isTestLicense
        ? durationDays
        : (isLifetimeKey ? 36500 : 30);
      const expiresAt = new Date();
      if (isTestLicense) {
        // Test: placeholder de 24h. Se não ativada nesse prazo, é purgada.
        // Na 1ª ativação cai para 10min.
        expiresAt.setTime(expiresAt.getTime() + 24 * 60 * 60 * 1000);
      } else if (!isLifetimeKey) {
        // Pagas: placeholder de 100 anos. Expiração real setada na 1ª ativação.
        expiresAt.setFullYear(expiresAt.getFullYear() + 100);
      } else {
        expiresAt.setTime(expiresAt.getTime() + effectiveDurationDays * 24 * 60 * 60 * 1000);
      }

      const testDurationHours = 10 / 60; // ~0.1667 (10 minutes)
      const paidDurationHours = 30 * 24; // 720h (30 dias)

      const { data, error } = await supabase
        .from('licenses')
        .insert({
          license_key: licenseKey,
          email,
          expires_at: expiresAt.toISOString(),
          price: price || 0,
          notes,
          duration_hours: isLifetimeKey
            ? null
            : (isTestLicense ? testDurationHours : paidDurationHours),
          first_activated_at: isLifetimeKey ? new Date().toISOString() : null,
          is_wildcard: isLifetimeKey ? true : false,
          created_by: user?.id,
          max_messages: null,
          customer_name: customerName || null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      await supabase.from('license_logs').insert({
        license_id: data.id,
        action: 'created',
        details: { email, duration_days: durationDays, created_by_reseller: user?.id, lifetime: !!isLifetime },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reseller-licenses'] });
      queryClient.invalidateQueries({ queryKey: ['reseller-stats'] });
      queryClient.invalidateQueries({ queryKey: ['reseller-credits'] });
      toast({ title: 'Licença criada', description: 'A licença foi criada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message || 'Não foi possível criar a licença.', variant: 'destructive' });
    },
  });
}

export function useUpdateCustomerName() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ licenseId, customerName }: { licenseId: string; customerName: string }) => {
      const { error } = await supabase
        .from('licenses')
        .update({ customer_name: customerName || null })
        .eq('id', licenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reseller-licenses'] });
      toast({ title: 'Nome atualizado', description: 'O nome do cliente foi atualizado.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o nome.', variant: 'destructive' });
    },
  });
}
