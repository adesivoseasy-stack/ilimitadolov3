import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  isReseller: boolean;
  isManager: boolean;
  resellerStatus: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; needsAdminRole?: boolean }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReseller, setIsReseller] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const [resellerStatus, setResellerStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resetAuthState = () => {
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setIsReseller(false);
    setIsManager(false);
    setResellerStatus(null);
  };

  const clearInvalidSession = async () => {
    // Do NOT call supabase.auth.signOut here — it races with a subsequent
    // signInWithPassword and wipes the freshly-issued JWT from localStorage,
    // causing RLS queries to return 0 rows even for valid reseller profiles.
    // The expired refresh token is already unusable; just clear local state.
    try {
      localStorage.removeItem(
        `sb-${new URL(import.meta.env.VITE_SUPABASE_URL).hostname.split('.')[0]}-auth-token`
      );
    } catch {
      // noop
    }
    resetAuthState();
    setIsLoading(false);
  };

  // Fetch all roles in a single round-trip instead of 3 separate queries.
  const checkAllRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (error || !data) return { admin: false, reseller: false, manager: false };
      const roles = new Set(data.map((r: any) => r.role));
      return {
        admin: roles.has('admin'),
        reseller: roles.has('reseller'),
        manager: roles.has('manager'),
      };
    } catch {
      return { admin: false, reseller: false, manager: false };
    }
  };

  const checkResellerStatus = async (userId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('reseller_profiles')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !data) return null;
      return data.status;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Apenas atualizar tokens em TOKEN_REFRESHED — não disparar refetch de roles
        // nem flippar isLoading (isso desmontava as rotas e gerava cascata de refresh).
        if (event === 'TOKEN_REFRESHED') {
          setSession(session);
          setUser(session?.user ?? null);
          return;
        }

        // USER_UPDATED: só atualiza o user, sem loading
        if (event === 'USER_UPDATED') {
          setSession(session);
          setUser(session?.user ?? null);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
          setIsLoading(true);
          setTimeout(() => {
            Promise.all([
              checkAllRoles(session.user.id),
              checkResellerStatus(session.user.id),
            ]).then(([roles, status]) => {
              setIsAdmin(roles.admin);
              setIsReseller(roles.reseller);
              setIsManager(roles.manager);
              setResellerStatus(status);
              setIsLoading(false);

              if (!roles.admin && !roles.reseller && !roles.manager && !status) {
                supabase.functions
                  .invoke('register-reseller-self', {
                    body: { name: session.user.email?.split('@')[0] || 'Revendedor' },
                  })
                  .then(() => {
                    checkResellerStatus(session.user.id).then((s) => setResellerStatus(s));
                  })
                  .catch((e) => console.error('[auth] auto register-reseller-self failed:', e));
              }
            }).catch(() => {
              setIsLoading(false);
            });
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          resetAuthState();
          setIsLoading(false);
        }
      }
    );

    // INITIAL_SESSION fires from onAuthStateChange above and hydrates roles.
    // We still call getSession to detect a broken refresh token and clear it.
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error?.code === 'refresh_token_not_found') {
        clearInvalidSession();
        return;
      }
      if (!session) {
        setIsLoading(false);
      }
    }).catch(async (error: any) => {
      if (error?.code === 'refresh_token_not_found') {
        await clearInvalidSession();
        return;
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    
    if (error) {
      return { error };
    }

    // Cria perfil de revendedor pendente para aprovação
    // (necessário para o usuário aparecer na lista de aprovações do admin)
    try {
      await supabase.functions.invoke('register-reseller-self', {
        body: {
          name: email.split('@')[0],
        },
      });
    } catch (e) {
      console.error('[signUp] register-reseller-self failed:', e);
    }

    return { error: null, needsAdminRole: true };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
    setIsReseller(false);
    setIsManager(false);
    setResellerStatus(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, isReseller, isManager, resellerStatus, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
