import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, User, Mail, Lock, Building, Phone, Shield, TrendingUp, Users, Award } from 'lucide-react';
import { z } from 'zod';
import logoImg from '@/assets/logo.png';
import { motion } from 'framer-motion';
import { translateAuthError } from '@/lib/authErrors';

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  company: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
});

export default function ResellerRegister() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Handle Google OAuth callback
  useEffect(() => {
    const isGoogleCallback = searchParams.get('google_signup') === 'true';
    if (!isGoogleCallback) return;

    const createResellerProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.functions.invoke('register-reseller-self', {
        body: {
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
        },
      });

      if (error || (data as any)?.error) {
        toast({
          title: 'Erro no cadastro',
          description: (data as any)?.error || error?.message || 'Falha ao registrar revendedor.',
          variant: 'destructive',
        });
        return;
      }

      if ((data as any)?.already_existed) {
        toast({ title: 'Já cadastrado', description: 'Você já possui um perfil de revendedor.' });
      } else {
        toast({
          title: 'Cadastro enviado com sucesso!',
          description: 'Seu cadastro foi recebido e está aguardando aprovação.',
        });
      }
      setTimeout(() => navigate('/auth'), 2000);
    };
    createResellerProfile();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const validation = registerSchema.safeParse({ name, email, password, company, phone });
    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });

    if (authError) {
      toast({
        title: 'Erro no cadastro',
        description: translateAuthError(authError.message),
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    if (!authData.user) {
      toast({ title: 'Erro', description: 'Não foi possível criar a conta.', variant: 'destructive' });
      setIsSubmitting(false);
      return;
    }

    // Cria perfil server-side (atômico, com SERVICE_ROLE) — funciona mesmo se a sessão demorar
    const { data: regData, error: regError } = await supabase.functions.invoke('register-reseller-self', {
      body: { name, company: company || undefined, phone: phone || undefined },
    });

    if (regError || (regData as any)?.error) {
      toast({
        title: 'Erro',
        description: (regData as any)?.error || 'Conta criada mas falha ao salvar perfil. Entre em contato com o suporte.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }

    toast({
      title: 'Cadastro enviado com sucesso!',
      description: 'Seu cadastro foi recebido e está aguardando aprovação. Você será notificado assim que for aprovado.',
    });

    setIsSubmitting(false);
    setTimeout(() => navigate('/auth'), 2000);
  };

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/reseller/register?google_signup=true`,
      });
      if (result.error) {
        toast({ title: 'Erro', description: 'Não foi possível conectar com o Google.', variant: 'destructive' });
      }
      if (result.redirected) return;

      // After Google auth (sem redirect), garantir perfil server-side
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase.functions.invoke('register-reseller-self', {
          body: {
            name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
          },
        });
        if (error || (data as any)?.error) {
          toast({ title: 'Erro', description: (data as any)?.error || 'Falha ao salvar perfil.', variant: 'destructive' });
        } else if ((data as any)?.already_existed) {
          toast({ title: 'Já cadastrado', description: 'Você já possui um perfil de revendedor.' });
          setTimeout(() => navigate('/auth'), 1500);
        } else {
          toast({
            title: 'Cadastro enviado com sucesso!',
            description: 'Seu cadastro foi recebido e está aguardando aprovação.',
          });
          setTimeout(() => navigate('/auth'), 2000);
        }
      }
    } catch {
      toast({ title: 'Erro', description: 'Falha na autenticação com Google.', variant: 'destructive' });
    }
    setIsGoogleLoading(false);
  };

  const benefits = [
    { icon: TrendingUp, title: 'Margens Premium', desc: 'Lucre até 60% por chave vendida' },
    { icon: Users, title: 'Painel Exclusivo', desc: 'Gerencie clientes e estoque' },
    { icon: Award, title: 'Suporte Prioritário', desc: 'Atendimento dedicado para parceiros' },
  ];

  const inputClass = "pl-10 h-12 rounded-xl bg-background/40 border-border/30 focus:border-primary/50 focus:bg-background/60 focus:shadow-[0_0_20px_hsl(265_80%_55%/0.1)] transition-all font-display";

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* ===== ANIMATED BACKGROUND ===== */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-15%] w-[700px] h-[700px] rounded-full bg-primary/[0.07] blur-[180px] animate-pulse-glow" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/[0.06] blur-[160px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/[0.03] blur-[200px]" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(hsl(265 80% 55% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(265 80% 55% / 0.4) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            style={{ animation: 'scanLine 6s linear infinite', top: '0%' }}
          />
        </div>
      </div>

      {/* ===== LEFT PANEL — Branding ===== */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative z-10 flex-col justify-between p-12 xl:p-16">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <img src={logoImg} alt="Logo" className="h-10 w-auto" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-6"
        >
          <div className="space-y-2 animate-fade-up-delay-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-primary font-display">Vagas Limitadas</span>
            </div>
            <h1 className="text-5xl xl:text-6xl font-black text-foreground leading-[1.05] font-display">
              Programa de
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
                Revenda
              </span>
              <br />
              Autorizada
            </h1>
          </div>
          <p className="text-base text-muted-foreground max-w-md leading-relaxed animate-fade-up-delay-2">
            Junte-se à nossa rede de revendedores e construa seu negócio digital com margens premium e suporte dedicado.
          </p>

          <div className="flex flex-col gap-4 pt-4">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + i * 0.15 }}
                className="flex items-center gap-4 group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <b.icon className="h-[18px] w-[18px] text-primary" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground font-display">{b.title}</div>
                  <div className="text-xs text-muted-foreground">{b.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1 }}
          className="flex items-center gap-8"
        >
          {[
            { value: '500+', label: 'Revendedores' },
            { value: 'R$49,90', label: 'A partir de' },
            { value: '24/7', label: 'Suporte' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-lg font-bold text-foreground font-display">{stat.value}</div>
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ===== DIVIDER ===== */}
      <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-border/60 to-transparent relative z-10" />

      {/* ===== RIGHT PANEL — Form ===== */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-6">
            <img src={logoImg} alt="Logo" className="h-10 w-auto mx-auto mb-4" />
          </div>

          {/* Header */}
          <div className="mb-7">
            <div className="lg:hidden inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-primary font-display">Vagas Limitadas</span>
            </div>
            <h2 className="text-3xl font-black text-foreground font-display leading-tight">
              Solicitar
              <br />
              Acesso
            </h2>
            <p className="text-sm text-muted-foreground mt-2">Preencha seus dados para se tornar um revendedor</p>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl p-7 shadow-2xl shadow-primary/5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-display">Nome completo *</Label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  <Input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" disabled={isSubmitting} />
                </div>
                {errors.name && <p className="text-xs text-destructive font-medium">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-display">Email *</Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  <Input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" disabled={isSubmitting} />
                </div>
                {errors.email && <p className="text-xs text-destructive font-medium">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-display">Senha *</Label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                  <Input type="password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" disabled={isSubmitting} />
                </div>
                {errors.password && <p className="text-xs text-destructive font-medium">{errors.password}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-display">Empresa</Label>
                  <div className="relative group">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                    <Input className={inputClass} value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Opcional" disabled={isSubmitting} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-display">Telefone</Label>
                  <div className="relative group">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                    <Input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" disabled={isSubmitting} />
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold font-display text-sm shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:brightness-110 disabled:opacity-50 transition-all duration-300 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  <span className="relative z-10">
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin inline" />Enviando...</> : 'Solicitar Cadastro'}
                  </span>
                </button>
              </div>




              <button
                type="button"
                onClick={() => navigate('/auth')}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors font-display"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </button>
            </form>
          </div>

          {/* Security badge */}
          <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/60">
            <Shield className="h-3 w-3" />
            <span className="font-display">Seus dados estão protegidos com criptografia AES-256</span>
          </div>
        </motion.div>
      </div>

      <style>{`
        @keyframes scanLine {
          0% { top: -1px; }
          100% { top: 100%; }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% center; }
          50% { background-position: 100% center; }
        }
        .animate-gradient-shift {
          animation: gradient-shift 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
