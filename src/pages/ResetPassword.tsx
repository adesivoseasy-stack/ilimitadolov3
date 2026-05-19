import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2, Lock, AlertTriangle } from 'lucide-react';
import { z } from 'zod';

const passwordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});
  const [isValidSession, setIsValidSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setIsValidSession(true);
      setIsLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setIsValidSession(true);
      setIsLoading(false);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const validation = passwordSchema.safeParse({ password, confirmPassword });
    if (!validation.success) {
      const fieldErrors: { password?: string; confirmPassword?: string } = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0] === 'password') fieldErrors.password = err.message;
        if (err.path[0] === 'confirmPassword') fieldErrors.confirmPassword = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Senha alterada!', description: 'Sua senha foi alterada com sucesso.' });
      navigate('/');
    }
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient opacity-20 blur-xl animate-pulse-glow" />
          <Loader2 className="h-10 w-10 animate-spin text-primary relative z-10" />
        </div>
      </div>
    );
  }

  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-destructive/5 blur-3xl animate-float" />
        <div className="w-full max-w-md relative z-10 animate-fade-up">
          <div className="text-center mb-8">
            <div className="mx-auto mb-5 relative w-16 h-16">
              <div className="absolute inset-0 rounded-2xl bg-destructive/20 blur-lg animate-pulse-glow" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 border border-destructive/20">
                <AlertTriangle className="h-7 w-7 text-destructive" />
              </div>
            </div>
            <h1 className="text-3xl font-bold mb-2">Link inválido</h1>
            <p className="text-sm text-muted-foreground">Este link de recuperação expirou ou é inválido.</p>
          </div>
          <Button className="w-full h-11 rounded-xl bg-gradient hover:opacity-90" onClick={() => navigate('/')}>
            Voltar ao login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      <div className="w-full max-w-md relative z-10 animate-fade-up">
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 relative w-16 h-16">
            <div className="absolute inset-0 rounded-2xl bg-gradient opacity-20 blur-lg animate-pulse-glow" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-subtle border border-primary/20">
              <Lock className="h-7 w-7 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gradient mb-2">Nova Senha</h1>
          <p className="text-sm text-muted-foreground">Digite sua nova senha</p>
        </div>

        <div className="glow-card p-[1px] rounded-2xl">
          <div className="glass-card rounded-2xl p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Nova senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="••••••••" className="pl-10 h-11 rounded-xl bg-secondary/50 border-border/50 focus:border-primary/50" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isSubmitting} />
                </div>
                {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="confirmPassword" type="password" placeholder="••••••••" className="pl-10 h-11 rounded-xl bg-secondary/50 border-border/50 focus:border-primary/50" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isSubmitting} />
                </div>
                {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl bg-gradient hover:opacity-90 font-medium" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : 'Salvar nova senha'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
