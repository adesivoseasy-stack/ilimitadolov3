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
  const { user } = useAuth();
  return useQuery({
    queryKey: ['reseller-licenses', user?.id],
    queryFn: async () => {
      if (!user) return [];
      await supabase.rpc('update_expired_licenses');
      const { data, error } = await supabase
        .from('licenses')
        .select('*, devices (*)')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((license: any) => ({
        ...license,
        devices: normalizeDevices(license.devices),
      })) as LicenseWithDevice[];
    },
    enabled: !!user,
  });
}

export function useResellerStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['reseller-stats', user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, active: 0, expired: 0, revoked: 0, revenue: 0 };
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
    enabled: !!user,
  });
}

export function useResellerCreateLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ email, durationDays, price, notes, isTestLicense, isWildcard, customerName }: {
      email: string;
      durationDays: number;
      price?: number;
      notes?: string;
      isTestLicense?: boolean;
      isWildcard?: boolean;
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
          // Check and consume credit
          const { data: hasCredit, error: creditError } = await supabase.rpc('use_reseller_credit', { _reseller_id: user?.id });
          if (creditError) throw creditError;
          if (!hasCredit) {
            throw new Error('Sem créditos disponíveis. Solicite mais créditos ao gerente.');
          }
        }
      }

      const { data: keyData, error: keyError } = await supabase.rpc('generate_license_key');
      if (keyError) throw keyError;
      const licenseKey = isTestLicense ? `TESTE-${keyData}` : keyData as string;

      // Todas as chaves pagas são mensais (30 dias). Wildcard mantém duração longa.
      const effectiveDurationDays = isTestLicense
        ? durationDays
        : (isWildcard ? Math.max(durationDays, 36500) : 30);
      const expiresAt = new Date();
      if (isTestLicense || !isWildcard) {
        // Test e pagas: placeholder de 100 anos. Expiração real é setada na 1ª ativação.
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
          duration_hours: isWildcard ? null : (isTestLicense ? testDurationHours : paidDurationHours),
          first_activated_at: isWildcard ? new Date().toISOString() : null,
          is_wildcard: isWildcard || false,
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
        details: { email, duration_days: durationDays, created_by_reseller: user?.id },
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
