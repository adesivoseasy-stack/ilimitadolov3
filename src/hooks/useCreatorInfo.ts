import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CreatorInfo {
  role: string;
  name?: string;
}

export function useCreatorInfo(creatorIds: (string | null)[]) {
  const uniqueIds = [...new Set(creatorIds.filter(Boolean))] as string[];

  return useQuery({
    queryKey: ['creator-info', uniqueIds.sort().join(',')],
    queryFn: async () => {
      if (uniqueIds.length === 0) return new Map<string, CreatorInfo>();

      const [{ data: roles }, { data: profiles }] = await Promise.all([
        supabase.from('user_roles').select('user_id, role').in('user_id', uniqueIds),
        supabase.from('reseller_profiles').select('user_id, name').in('user_id', uniqueIds),
      ]);

      const map = new Map<string, CreatorInfo>();

      const roleMap: Record<string, string> = {
        admin: 'Admin',
        manager: 'Gerente',
        reseller: 'Revendedor',
      };

      for (const id of uniqueIds) {
        const userRole = roles?.find(r => r.user_id === id);
        const profile = profiles?.find(p => p.user_id === id);
        const roleName = userRole ? roleMap[userRole.role] || userRole.role : 'Desconhecido';
        map.set(id, {
          role: roleName,
          name: profile?.name,
        });
      }

      return map;
    },
    enabled: uniqueIds.length > 0,
  });
}
