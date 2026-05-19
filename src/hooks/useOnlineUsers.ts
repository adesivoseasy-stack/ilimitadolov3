import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OnlineUser {
  session_id: string;
  license_key: string;
  email: string;
  customer_name: string | null;
  device_name: string | null;
  hwid: string;
  last_activity: string;
  creator_name: string | null;
}

export function useOnlineUsers() {
  return useQuery({
    queryKey: ['online-users'],
    queryFn: async () => {
      // Get active sessions (not expired)
      const { data: sessions, error: sessError } = await supabase
        .from('sessions')
        .select('id, license_id, hwid, last_activity, expires_at')
        .gt('expires_at', new Date().toISOString())
        .order('last_activity', { ascending: false });

      if (sessError) throw sessError;
      if (!sessions || sessions.length === 0) return [];

      const licenseIds = [...new Set(sessions.map(s => s.license_id))];

      const [{ data: licenses }, { data: devices }, { data: profiles }] = await Promise.all([
        supabase.from('licenses').select('id, license_key, email, customer_name, created_by').in('id', licenseIds),
        supabase.from('devices').select('license_id, device_name, hwid').in('license_id', licenseIds),
        supabase.from('reseller_profiles').select('user_id, name'),
      ]);

      const licenseMap = new Map((licenses || []).map(l => [l.id, l]));
      const deviceMap = new Map((devices || []).map(d => [`${d.license_id}_${d.hwid}`, d]));
      const profileMap = new Map((profiles || []).map(p => [p.user_id, p.name]));

      return sessions.map(s => {
        const license = licenseMap.get(s.license_id);
        const device = deviceMap.get(`${s.license_id}_${s.hwid}`);
        return {
          session_id: s.id,
          license_key: license?.license_key || '—',
          email: license?.email || '—',
          customer_name: license?.customer_name || null,
          device_name: device?.device_name || null,
          hwid: s.hwid,
          last_activity: s.last_activity,
          creator_name: license?.created_by ? profileMap.get(license.created_by) || null : null,
        } as OnlineUser;
      });
    },
    refetchInterval: 15000, // Auto-refresh every 15s
  });
}
