import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  status: 'active' | 'expired' | 'revoked';
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
}

function normalizeDevices(devices: Device | Device[] | null | undefined): Device[] {
  if (!devices) return [];
  if (Array.isArray(devices)) return devices;
  return [devices];
}

// ── Main hook: fetch all licenses with devices (paginated to bypass 1000-row default cap) ──
async function fetchAllLicensesPaginated() {
  const PAGE_SIZE = 1000;
  const all: any[] = [];
  let from = 0;
  // Safety cap at 50k rows
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase
      .from('licenses')
      .select('*, devices(*)')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return all;
}

export function useLicenses() {
  return useQuery({
    queryKey: ['licenses'],
    queryFn: async () => {
      // Fire-and-forget: don't block the main query
      supabase.rpc('update_expired_licenses').then(() => {});
      const [licensesData, profilesRes] = await Promise.all([
        fetchAllLicensesPaginated(),
        supabase.from('reseller_profiles').select('user_id, name'),
      ]);
      const profileMap = new Map<string, string>();
      (profilesRes.data || []).forEach((p: any) => profileMap.set(p.user_id, p.name));
      return licensesData.map((license: any) => ({
        ...license,
        devices: normalizeDevices(license.devices),
        creator_name: license.created_by ? profileMap.get(license.created_by) || null : null,
      })) as LicenseWithDevice[];
    },
    staleTime: 15_000,
  });
}

// ── Stats hook ──
export function useLicenseStats() {
  return useQuery({
    queryKey: ['license-stats'],
    queryFn: async () => {
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
  });
}

// ── Wildcard usage hook ──
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

// ── Create license mutation ──
export function useCreateLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ email, durationDays, price, notes, isTestLicense, isWildcard }: {
      email: string;
      durationDays: number;
      price?: number;
      notes?: string;
      isTestLicense?: boolean;
      isWildcard?: boolean;
    }) => {
      const { data: keyData, error: keyError } = await supabase.rpc('generate_license_key');
      if (keyError) throw keyError;

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

      // Todas as chaves pagas são mensais (30 dias). Wildcard mantém duração longa.
      const effectiveDurationDays = isTestLicense
        ? durationDays
        : (isWildcard ? Math.max(durationDays, 36500) : 30);
      const durationHours = effectiveDurationDays * 24;
      const expiresAt = new Date();
      if (isTestLicense) {
        expiresAt.setFullYear(expiresAt.getFullYear() + 100);
      } else {
        expiresAt.setTime(expiresAt.getTime() + effectiveDurationDays * 24 * 60 * 60 * 1000);
      }

      const { data, error } = await supabase
        .from('licenses')
        .insert({
          license_key: keyData,
          email,
          expires_at: expiresAt.toISOString(),
          price: price || 0,
          notes,
          duration_hours: isTestLicense ? durationHours : null,
          first_activated_at: isTestLicense ? null : new Date().toISOString(),
          is_wildcard: isWildcard || false,
          max_messages: isTestLicense ? testMessageLimit : null,
          created_by: user?.id || null,
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
      toast({ title: 'Licença criada', description: 'A licença foi criada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

// ── Renew license mutation (expire old key, create new key) ──
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

      // Expire old license
      const { error: expireError } = await supabase
        .from('licenses')
        .update({ status: 'expired' as const, notes: `${oldLicense.notes || ''}\n[Renovada → nova chave gerada]`.trim() })
        .eq('id', licenseId);
      if (expireError) throw expireError;

      // Generate new key
      const { data: newKey, error: keyError } = await supabase.rpc('generate_license_key');
      if (keyError) throw keyError;

      // Renovação sempre mensal (30 dias), exceto wildcard
      const effectiveDurationDays = oldLicense.is_wildcard ? Math.max(durationDays, 36500) : 30;
      const newExpiry = new Date();
      newExpiry.setTime(newExpiry.getTime() + effectiveDurationDays * 24 * 60 * 60 * 1000);

      // Create new license with same properties
      const { data: newLicense, error: createError } = await supabase
        .from('licenses')
        .insert({
          license_key: newKey,
          email: oldLicense.email,
          expires_at: newExpiry.toISOString(),
          price: oldLicense.price,
          notes: `Renovação da chave ${oldLicense.license_key}`,
          duration_hours: null,
          first_activated_at: new Date().toISOString(),
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

// ── Revoke license mutation ──
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
      toast({ title: 'Revogada', description: 'Licença revogada.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

// ── Reset device mutation ──
export function useResetDevice() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (licenseId: string) => {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('license_id', licenseId);
      if (error) throw error;

      // Also clear sessions
      const { error: sessionError } = await supabase
        .from('sessions')
        .delete()
        .eq('license_id', licenseId);
      if (sessionError) console.warn('Failed to clear sessions:', sessionError);

      await supabase.from('license_logs').insert({
        license_id: licenseId,
        action: 'device_reset',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      queryClient.invalidateQueries({ queryKey: ['reseller-licenses'] });
      toast({ title: 'Dispositivo resetado', description: 'O dispositivo foi desvinculado.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

// ── Set license expiry mutation ──
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
      toast({ title: 'Atualizado', description: 'Data de expiração alterada.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}

// ── Delete license mutation ──
export function useDeleteLicense() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (licenseId: string) => {
      // Delete related records first
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
      toast({ title: 'Excluída', description: 'Licença excluída permanentemente.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });
}
