import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CreditosCustomerProfile {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
}

export function useCreditosCustomer() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CreditosCustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('credits_customers')
      .select('id, user_id, name, phone')
      .eq('user_id', user.id)
      .maybeSingle();
    setProfile((data as CreditosCustomerProfile | null) ?? null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const ensureProfile = useCallback(
    async (name?: string, phone?: string) => {
      const { data, error } = await supabase.functions.invoke('register-credits-customer', {
        body: { name, phone },
      });
      if (error) throw new Error(error.message || 'Erro ao registrar perfil');
      if (data?.error) throw new Error(data.error);
      await fetchProfile();
      return data;
    },
    [fetchProfile]
  );

  return { profile, loading, refetch: fetchProfile, ensureProfile };
}
