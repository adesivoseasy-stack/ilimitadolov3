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

  const checkAdminRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        return false;
      }

      return !!data;
    } catch (err) {
      console.error('Error in checkAdminRole:', err);
      return false;
    }
  };

  const checkResellerRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'reseller')
        .maybeSingle();

      if (error) return false;
      return !!data;
    } catch {
      return false;
    }
  };

  const checkManagerRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'manager')
        .maybeSingle();

      if (error) return false;
      return !!data;
    } catch {
      return false;
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
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            Promise.all([
              checkAdminRole(session.user.id),
              checkResellerRole(session.user.id),
              checkManagerRole(session.user.id),
              checkResellerStatus(session.user.id),
            ]).then(([admin, reseller, manager, status]) => {
              setIsAdmin(admin);
              setIsReseller(reseller);
              setIsManager(manager);
              setResellerStatus(status);
              setIsLoading(false);
            }).catch(() => {
              setIsLoading(false);
            });
          }, 0);
        } else {
          setIsAdmin(false);
          setIsReseller(false);
          setIsManager(false);
          setResellerStatus(null);
          setIsLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        Promise.all([
          checkAdminRole(session.user.id),
          checkResellerRole(session.user.id),
          checkManagerRole(session.user.id),
          checkResellerStatus(session.user.id),
        ]).then(([admin, reseller, manager, status]) => {
          setIsAdmin(admin);
          setIsReseller(reseller);
          setIsManager(manager);
          setResellerStatus(status);
          setIsLoading(false);
        }).catch(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    }).catch(() => {
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
