import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export interface Device {
  id: string;
  license_id: string;
  hwid: string;
  device_name: string | null;
  activated_at: string;
  last_seen_at: string;
}

export interface LicenseWithDevice {
  id: string;
  license_key: string;
  email: string;
  status: 'active' | 'expired' | 'revoked' | 'archived';
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  price: number | null;
  duration_hours: number | null;
  first_activated_at: string | null;
  is_wildcard: boolean | null;
  created_by: string | null;
  max_messages: number | null;
  messages_used: number;
  notes: string | null;
  devices: Device[];
  customer_name: string | null;
  creator_name?: string;
  // Plan & daily limits (migration 20260831)
  plan: 'basico' | 'plus' | 'pro' | 'fundador';
  daily_limit: number;
  daily_used: number;
  daily_reset_at: string | null;
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function normalizeDevices(devices: Device | Device[] | null | undefined): Device[] {
  if (!devices) return [];
  if (Array.isArray(devices)) return devices;
  return [devices];
}

// â”€â”€ Main hook: fetch all licenses with devices.
// Admin/manager: RPC `admin_list_licenses` (uma query sÃ³, sem overhead de RLS por linha).
// Fallback: paginaÃ§Ã£o com nested select.
async function fetchAllLicensesPaginated() {
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_list_licenses' as any);
  if (!rpcError && Array.isArray(rpcData)) {
    return rpcData as any[];
  }
  if (rpcError) {
    console.warn('[useLicenses] RPC falhou, usando fallback:', rpcError.message);
  }
  const PAGE_SIZE = 1000;
  const all: any[] = [];
  let from = 0;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase
      .from('licenses')
      .select('*, devices(*)')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = ensureArray(data);
    if (page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

export function useLicenses() {
  const { user, isLoading: isAuthLoading, isAdmin, isManager } = useAuth();

  return useQuery({
    queryKey: ['licenses', user?.id, isAdmin, isManager],
    queryFn: async () => {
      if (!user || (!isAdmin && !isManager)) return [];
      // Fire-and-forget: don't block the main query
      supabase.rpc('update_expired_licenses').then(() => {});
      const [licensesData, profilesRes] = await Promise.all([
        fetchAllLicensesPaginated(),
        supabase.from('reseller_profiles').select('user_id, name'),
      ]);
      const profileMap = new Map<string, string>();
      ensureArray(profilesRes.data).forEach((p: any) => profileMap.set(p.user_id, p.name));
      return ensureArray(licensesData).map((license: any) => ({
        ...license,
        devices: normalizeDevices(license.devices),
        creator_name: license.created_by ? profileMap.get(license.created_by) || null : null,
      })) as LicenseWithDevice[];
    },
    staleTime: 15_000,
    enabled: !isAuthLoading && !!user && (isAdmin || isManager),
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });
}

// â”€â”€ Stats hook â”€â”€
export function useLicenseStats() {
  const { user, isLoading: isAuthLoading, isAdmin, isManager } = useAuth();

  return useQuery({
    queryKey: ['license-stats', user?.id, isAdmin, isManager],
    queryFn: async () => {
      if (!user || (!isAdmin && !isManager)) {
        return { total: 0, active: 0, expired: 0, revoked: 0, revenue: 0 };
      }

      const PAGE_SIZE = 1000;
      const all: { status: string; price: number | null }[] = [];
      let from = 0;
      for (let i = 0; i < 50; i++) {
        const { data, error } = await supabase
          .from('licenses')
          .select('status, price')
          .range(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all.push(...(data as any));
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      return {
        total: all.length,
        active: all.filter(l => l.status === 'active').length,
        expired: all.filter(l => l.status === 'expired').length,
        revoked: all.filter(l => l.status === 'revoked').length,
        revenue: all.reduce((sum, l) => sum + (Number(l.price) || 0), 0),
      };
    },
    enabled: !isAuthLoading && !!user && (isAdmin || isManager),
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: true,
  });
}

// â”€â”€ Wildcard usage hook â”€â”€
export function useWildcardUsage() {
  return useQuery({
    queryKey: ['wildcard-usage'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wildcard_usage')
        .select('*')
        .order('last_used_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useWildcardStats() {
  return useQuery({
    queryKey: ['wildcard-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wildcard_usage')
        .select('ip_address, message_count');
      if (error) throw error;
      return {
        totalIPs: data?.length || 0,
        totalMessages: data?.reduce((sum, w) => sum + (w.message_count || 0), 0) || 0,
      };
    },
  });
}

// â”€â”€ Create license mutation â”€â”€
export function useCreateLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ email, durationDays, price, notes, isTestLicense, isWildcard, plan }: {
      email: string;
      durationDays: number;
      price?: number;
      notes?: string;
      isTestLicense?: boolean;
      isWildcard?: boolean;
      plan?: 'basico' | 'plus' | 'pro' | 'fundador';
    }) => {
      const { data: keyData, error: keyError } = await supabase.rpc('generate_license_key');
      if (keyError) throw keyError;
      const rawKey = keyData as string;
      const shortTestKey = rawKey.split('-').slice(0, 3).join('-');
      const licenseKey = isTestLicense ? `TESTE-${shortTestKey}` : rawKey;

      // Get current user for created_by
      const { data: { user } } = await supabase.auth.getUser();

      let testMessageLimit = 10;
      if (isTestLicense) {
        const { data: configData } = await supabase
          .from('system_config')
          .select('value')
          .eq('key', 'test_message_limit')
          .maybeSingle();
        if (configData?.value) testMessageLimit = parseInt(configData.value, 10) || 10;
      }

      // Paid keys: 30 dias contados a partir da primeira ativaÃ§Ã£o por dispositivo.
      // Wildcard: duraÃ§Ã£o longa. Test: comportamento original.
      const effectiveDurationDays = isTestLicense
        ? durationDays
        : (isWildcard ? Math.max(durationDays, 36500) : 30);
      const durationHours = effectiveDurationDays * 24;
      const expiresAt = new Date();
      if (isTestLicense || !isWildcard) {
        // Test e pagas: placeholder de 100 anos. A expiraÃ§Ã£o real Ã© definida na 1Âª ativaÃ§Ã£o.
        expiresAt.setFullYear(expiresAt.getFullYear() + 100);
      } else {
        expiresAt.setTime(expiresAt.getTime() + effectiveDurationDays * 24 * 60 * 60 * 1000);
      }

      const dailyLimitMap: Record<string, number> = {
        basico: 50, plus: 100, pro: 200, fundador: 120,
      };
      const resolvedPlan = plan ?? 'basico';
      const dailyLimit = dailyLimitMap[resolvedPlan] ?? 50;

      const { data, error } = await supabase
        .from('licenses')
        .insert({
          license_key: licenseKey,
          email,
          expires_at: expiresAt.toISOString(),
          price: price || 0,
          notes,
          duration_hours: isWildcard ? null : durationHours,
          first_activated_at: isWildcard ? new Date().toISOString() : null,
          is_wildcard: isWildcard || false,
          max_messages: isTestLicense ? testMessageLimit : null,
          created_by: user?.id || null,
          plan: resolvedPlan,
          daily_limit: dailyLimit,
        } as any)
        .select()
        .single();
      if (error) throw error;

      await supabase.from('license_logs').insert({
        license_id: data.id,
        action: 'created',
        details: { email, duration_days: durationDays },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      toast({ title: 'LicenÃ§a criada', description: 'A licenÃ§a foi criada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

// â”€â”€ Renew license mutation (expire old key, create new key) â”€â”€
export function useRenewLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ licenseId, durationDays }: { licenseId: string; durationDays: number }) => {
      // Fetch old license details
      const { data: oldLicense, error: fetchError } = await supabase
        .from('licenses')
        .select('*')
        .eq('id', licenseId)
        .single();
      if (fetchError) throw fetchError;

      // RenovaÃ§Ã£o cobra novamente: consome 1 crÃ©dito do revendedor (exceto wildcard)
      if (!oldLicense.is_wildcard) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('reseller_profiles')
            .select('plan_type')
            .eq('user_id', user.id)
            .maybeSingle();
          const isUnlimited = profile?.plan_type === '997';
          if (!isUnlimited) {
            const { data: hasCredit, error: creditError } = await supabase.rpc('use_reseller_credit', { _reseller_id: user.id });
            if (creditError) throw creditError;
            if (!hasCredit) {
              throw new Error('Sem crÃ©ditos disponÃ­veis para renovar. Compre mais chaves no Dashboard.');
            }
          }
        }
      }

      // Expire old license
      const { error: expireError } = await supabase
        .from('licenses')
        .update({ status: 'expired' as const, notes: `${oldLicense.notes || ''}\n[Renovada â†’ nova chave gerada]`.trim() })
        .eq('id', licenseId);
      if (expireError) throw expireError;

      // Generate new key
      const { data: newKey, error: keyError } = await supabase.rpc('generate_license_key');
      if (keyError) throw keyError;

      // RenovaÃ§Ã£o: 30 dias contados a partir da 1Âª ativaÃ§Ã£o da nova chave (exceto wildcard)
      const effectiveDurationDays = oldLicense.is_wildcard ? Math.max(durationDays, 36500) : 30;
      const newExpiry = new Date();
      if (oldLicense.is_wildcard) {
        newExpiry.setTime(newExpiry.getTime() + effectiveDurationDays * 24 * 60 * 60 * 1000);
      } else {
        newExpiry.setFullYear(newExpiry.getFullYear() + 100);
      }

      const { data: newLicense, error: createError } = await supabase
        .from('licenses')
        .insert({
          license_key: newKey,
          email: oldLicense.email,
          expires_at: newExpiry.toISOString(),
          price: oldLicense.price,
          notes: `RenovaÃ§Ã£o da chave ${oldLicense.license_key}`,
          duration_hours: oldLicense.is_wildcard ? null : effectiveDurationDays * 24,
          first_activated_at: oldLicense.is_wildcard ? new Date().toISOString() : null,
          is_wildcard: oldLicense.is_wildcard,
          created_by: oldLicense.created_by,
          max_messages: oldLicense.max_messages,
          customer_name: oldLicense.customer_name,
        } as any)
        .select()
        .single();
      if (createError) throw createError;

      // Log both actions
      await supabase.from('license_logs').insert([
        { license_id: licenseId, action: 'expired_by_renewal', details: { new_license_id: newLicense.id, new_key: newKey } },
        { license_id: newLicense.id, action: 'created_by_renewal', details: { old_license_id: licenseId, old_key: oldLicense.license_key, duration_days: durationDays } },
      ]);

      return newLicense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['reseller-licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      queryClient.invalidateQueries({ queryKey: ['reseller-stats'] });
      toast({ title: 'Renovada', description: 'Chave antiga expirada e nova chave gerada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

export function useRevokeLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (licenseId: string) => {
      const { error } = await supabase
        .from('licenses')
        .update({ status: 'revoked' as const, revoked_at: new Date().toISOString() })
        .eq('id', licenseId);
      if (error) throw error;

      await supabase.from('license_logs').insert({
        license_id: licenseId,
        action: 'revoked',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      toast({ title: 'Revogada', description: 'LicenÃ§a revogada.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

// â”€â”€ Reset device mutation â”€â”€
export function useResetDevice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (licenseId: string) => {
      const { error: licenseError } = await supabase
        .from('licenses')
        .update({ hwid: null, hwid_set_at: null })
        .eq('id', licenseId)
        .select('id')
        .single();
      if (licenseError) throw licenseError;

      const { error: deviceError } = await supabase
        .from('devices')
        .delete()
        .eq('license_id', licenseId);
      if (deviceError) throw deviceError;

      await supabase.from('license_logs').insert({
        license_id: licenseId,
        action: 'device_reset',
      });

      // Limpar tokenStore no servidor LOV3 (memÃ³ria)
      try {
        await fetch('https://lov3-server.fly.dev/api/licenca/reset-device', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ licenseId }),
        });
      } catch (e) {
        console.warn('[reset-device] falha ao notificar servidor:', e);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['reseller-licenses'] });
      toast({ title: 'Dispositivo resetado', description: 'O dispositivo foi desvinculado com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

// â”€â”€ Set license expiry mutation â”€â”€
export function useSetLicenseExpiry() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ licenseId, newExpiresAt }: { licenseId: string; newExpiresAt: string }) => {
      const { error } = await supabase
        .from('licenses')
        .update({ expires_at: newExpiresAt, status: 'active' as const })
        .eq('id', licenseId);
      if (error) throw error;

      await supabase.from('license_logs').insert({
        license_id: licenseId,
        action: 'expiry_changed',
        details: { new_expires_at: newExpiresAt },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      toast({ title: 'Atualizado', description: 'Data de expiraÃ§Ã£o alterada.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

// â”€â”€ Delete license mutation â”€â”€
export function useDeleteLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (licenseId: string) => {
      await supabase.from('devices').delete().eq('license_id', licenseId);
      await supabase.from('sessions').delete().eq('license_id', licenseId);
      await supabase.from('license_logs').delete().eq('license_id', licenseId);

      const { error } = await supabase
        .from('licenses')
        .delete()
        .eq('id', licenseId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['license-stats'] });
      toast({ title: 'ExcluÃ­da', description: 'LicenÃ§a excluÃ­da permanentemente.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

// â”€â”€ Archive license mutation (preserva dados, pode ser reativada) â”€â”€
export function useArchiveLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (licenseId: string) => {
      const { error } = await supabase.from('licenses').update({ status: 'archived' as any }).eq('id', licenseId);
      if (error) throw error;
      await supabase.from('license_logs').insert({ license_id: licenseId, action: 'archived' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['licenses'] }); toast({ title: 'Arquivada', description: 'LicenÃ§a arquivada. Pode ser reativada a qualquer momento.' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });
}

// â”€â”€ Reactivate archived license mutation â”€â”€
export function useReactivateLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (licenseId: string) => {
      const { error } = await supabase.from('licenses').update({ status: 'active' as any }).eq('id', licenseId);
      if (error) throw error;
      await supabase.from('license_logs').insert({ license_id: licenseId, action: 'reactivated' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['licenses'] }); toast({ title: 'Reativada', description: 'LicenÃ§a estÃ¡ ativa novamente.' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });
}

// â”€â”€ Set license plan mutation (admin) â”€â”€
export function useSetLicensePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ licenseId, plan }: { licenseId: string; plan: 'basico' | 'plus' | 'pro' | 'fundador' }) => {
      const dailyLimitMap: Record<string, number> = { basico: 50, plus: 100, pro: 200, fundador: 120 };
      const daily_limit = dailyLimitMap[plan] ?? 50;
      const { error } = await supabase.from('licenses').update({ plan, daily_limit } as any).eq('id', licenseId);
      if (error) throw error;
      await supabase.from('license_logs').insert({ license_id: licenseId, action: 'plan_changed', details: { plan, daily_limit } });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['licenses'] }); toast({ title: 'Plano atualizado', description: 'Plano e limite diÃ¡rio atualizados.' }); },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });
}
