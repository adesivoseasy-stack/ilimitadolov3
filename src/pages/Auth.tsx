import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, KeyRound, Lock, Mail, Shield, Zap, Globe, Sparkles, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import logoImg from '@/assets/logo.png';
import { motion, AnimatePresence } from 'framer-motion';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const emailSchema = z.object({
  email: z.string().email('Email inválido'),
});

export default function Auth() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const { signIn, signUp, user, isAdmin, isLoading, isReseller, isManager, resellerStatus } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!isLoading && user) {
      if (isAdmin) navigate('/dashboard');
      else if (isManager) navigate('/manager/dashboard');
      else if (isReseller && resellerStatus === 'approved') navigate('/reseller/dashboard');
    }
  }, [user, isAdmin, isManager, isReseller, resellerStatus, isLoading, navigate]);

  const handleForgotPassword = async (data: z.infer<typeof emailSchema>) => {
    setIsSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Email enviado!', description: 'Verifique sua caixa de entrada para redefinir sua senha.' });
      setShowForgotPassword(false);
      emailForm.reset();
    }
    setIsSubmitting(false);
  };

  const handleSubmit = async (data: z.infer<typeof loginSchema>) => {
    setIsSubmitting(true);
    if (activeTab === 'signup') {
      const { error, needsAdminRole } = await signUp(data.email, data.password);
      if (error) {
        toast({
          title: 'Erro no cadastro',
          description: error.message === 'User already registered' ? 'Este email já está cadastrado. Faça login.' : error.message,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      if (needsAdminRole) {
        toast({ title: 'Conta criada!', description: 'Sua conta foi criada. Agora você precisa receber permissão de admin para acessar o painel.' });
      }
      setIsSubmitting(false);
      return;
    }
    const { error } = await signIn(data.email, data.password);
    if (error) {
      const msg = error.message || '';
      let description = msg;
      if (msg === 'Invalid login credentials') {
        description = 'Credenciais inválidas. Verifique seu email e senha.';
      } else if (msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('networkerror') || msg.toLowerCase().includes('load failed')) {
        description = 'Erro de conexão. Verifique sua internet e tente novamente.';
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        description = 'Email não confirmado. Verifique sua caixa de entrada.';
      }
      toast({
        title: 'Erro no login',
        description,
        variant: 'destructive',
      });
      setIsSubmitting(false);
      return;
    }
    setTimeout(() => setIsSubmitting(false), 1500);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: 'Erro', description: 'Não foi possível conectar com o Google.', variant: 'destructive' });
      }
      if (result.redirected) return;
    } catch {
      toast({ title: 'Erro', description: 'Falha na autenticação com Google.', variant: 'destructive' });
    }
    setIsGoogleLoading(false);
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

  const features = [
    { icon: Shield, label: 'Licenças Seguras', desc: 'Proteção com criptografia avançada' },
    { icon: Zap, label: 'Ativação Instantânea', desc: 'Deploy automático em segundos' },
    { icon: Globe, label: 'Rede Global', desc: 'Infraestrutura distribuída 24/7' },
  ];

  const inputClasses = "pl-11 h-[52px] rounded-2xl bg-background/50 border-border/20 focus:border-primary/40 focus:bg-background/70 focus:shadow-[0_0_30px_hsl(265_80%_55%/0.08)] transition-all duration-300 font-display text-[15px]";

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* ===== ANIMATED BACKGROUND ===== */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-25%] left-[-10%] w-[800px] h-[800px] rounded-full bg-primary/[0.06] blur-[200px] animate-pulse-glow" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[700px] h-[700px] rounded-full bg-accent/[0.05] blur-[180px] animate-pulse-glow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[60%] w-[500px] h-[500px] rounded-full bg-primary/[0.03] blur-[150px] animate-pulse-glow" style={{ animationDelay: '4s' }} />
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(265 80% 55%) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* ===== LEFT PANEL — Branding ===== */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[46%] relative z-10 flex-col justify-between p-10 lg:p-14 xl:p-20 items-center text-center">
        {/* Top: Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="self-start"
        >
          <img src={logoImg} alt="Logo" className="h-9 w-auto opacity-90" />
        </motion.div>

        {/* Center: Hero text */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="space-y-8"
        >
          <div className="space-y-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/[0.06] backdrop-blur-sm"
            >
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90 font-display">Sistema Operacional</span>
            </motion.div>
            <HeroLoopingTitle />
          </div>
          <p className="text-sm lg:text-[15px] text-muted-foreground/80 max-w-sm leading-relaxed mx-auto">
            Plataforma premium de gerenciamento de chaves com tecnologia de ponta para controle total do seu negócio.
          </p>

          {/* Feature cards */}
          <div className="flex flex-col gap-3 pt-2 items-center">
            {features.map((f, i) => (
              <motion.div
                key={f.label}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.6 + i * 0.15 }}
                className="flex items-center gap-4 group w-full max-w-[320px] px-4 py-3 rounded-2xl border border-border/10 bg-card/20 backdrop-blur-sm hover:bg-card/40 hover:border-primary/10 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/10 flex items-center justify-center shrink-0 group-hover:from-primary/25 group-hover:to-accent/15 transition-all">
                  <f.icon className="h-[18px] w-[18px] text-primary" />
                </div>
                <div className="text-left">
                  <div className="text-[13px] font-semibold text-foreground font-display">{f.label}</div>
                  <div className="text-[11px] text-muted-foreground/70">{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Bottom: Stats row */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="flex items-center gap-10"
        >
          {[
            { value: '99.9%', label: 'Uptime' },
            { value: '< 50ms', label: 'Latência' },
            { value: '256-bit', label: 'Encrypt' },
          ].map((stat, i) => (
            <div key={stat.label} className="flex flex-col items-center">
              <div className="text-lg font-bold text-foreground font-display">{stat.value}</div>
              <div className="text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] font-display">{stat.label}</div>
              {i < 2 && <div className="hidden" />}
            </div>
          ))}
        </motion.div>
      </div>

      {/* ===== DIVIDER ===== */}
      <div className="hidden lg:block w-px relative z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-border/40 to-transparent" />
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/30" />
      </div>

      {/* ===== RIGHT PANEL — Auth Form ===== */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10">
        <div className="w-full max-w-[420px]">
          <AnimatePresence mode="wait">
            {showForgotPassword ? (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-center mb-8">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', bounce: 0.4 }}
                    className="mx-auto mb-5 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-accent/10 border border-primary/15 flex items-center justify-center"
                  >
                    <Mail className="h-7 w-7 text-primary" />
                  </motion.div>
                  <h2 className="text-2xl font-bold text-foreground font-display">Recuperar Senha</h2>
                  <p className="text-sm text-muted-foreground/70 mt-2">Enviaremos um link para redefinir</p>
                </div>

                <div className="rounded-3xl border border-border/20 bg-card/30 backdrop-blur-3xl p-8 shadow-2xl shadow-primary/[0.03]">
                  <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit(handleForgotPassword)} className="space-y-5">
                      <FormField control={emailForm.control} name="email" render={({ field }) => (
                        <FormItem className="space-y-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 font-display">Email</div>
                          <FormControl>
                            <div className="relative group">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/40 group-focus-within:text-primary transition-colors duration-300" />
                              <Input {...field} placeholder="seu@email.com" className={inputClasses} disabled={isSubmitting} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold font-display text-sm shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:brightness-110 disabled:opacity-50 transition-all duration-300 relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <span className="relative z-10">
                          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin inline" />Enviando...</> : 'Enviar link de recuperação'}
                        </span>
                      </button>
                      <button type="button" className="w-full py-3 text-muted-foreground hover:text-foreground text-sm font-display flex items-center justify-center gap-2 transition-colors" onClick={() => setShowForgotPassword(false)}>
                        <ArrowLeft className="h-4 w-4" />Voltar ao login
                      </button>
                    </form>
                  </Form>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="auth"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Mobile logo */}
                <div className="lg:hidden text-center mb-8">
                  <img src={logoImg} alt="Logo" className="h-9 w-auto mx-auto mb-5" />
                  <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-primary/15 bg-primary/[0.06]">
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/90 font-display">Sistema Ativo</span>
                  </div>
                </div>

                {/* Welcome */}
                <div className="mb-8">
                  <h2 className="text-3xl sm:text-[2rem] font-black text-foreground font-display leading-tight">
                    {activeTab === 'login' ? (
                      <>Bem-vindo <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">de volta</span></>
                    ) : (
                      <>Criar <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">conta</span></>
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground/70 mt-2 font-display">
                    {activeTab === 'login' ? 'Acesse seu painel de controle' : 'Registre-se para começar'}
                  </p>
                </div>

                {/* Tab Selector */}
                <div className="flex gap-1 p-1.5 rounded-2xl bg-card/30 border border-border/15 backdrop-blur-sm mb-7">
                  {(['login', 'signup'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-3 text-sm font-semibold rounded-xl transition-all duration-300 font-display relative overflow-hidden ${
                        activeTab === tab
                          ? 'text-primary-foreground shadow-lg shadow-primary/25'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {activeTab === tab && (
                        <motion.div
                          layoutId="activeTab"
                          className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-xl"
                          transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                        />
                      )}
                      <span className="relative z-10">{tab === 'login' ? 'Entrar' : 'Cadastrar'}</span>
                    </button>
                  ))}
                </div>

                {/* Form */}
                <div className="rounded-3xl border border-border/20 bg-card/30 backdrop-blur-3xl p-8 shadow-2xl shadow-primary/[0.03]">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
                      <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem className="space-y-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 font-display">Email</div>
                          <FormControl>
                            <div className="relative group">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/40 group-focus-within:text-primary transition-colors duration-300" />
                              <Input {...field} type="email" placeholder="seu@email.com" className={inputClasses} disabled={isSubmitting} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem className="space-y-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70 font-display">Senha</div>
                          <FormControl>
                            <div className="relative group">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-muted-foreground/40 group-focus-within:text-primary transition-colors duration-300" />
                              <Input {...field} type={showPassword ? 'text' : 'password'} placeholder="••••••••••" className={`${inputClasses} pr-12`} disabled={isSubmitting} />
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground/70 transition-colors"
                              >
                                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      {activeTab === 'login' && (
                        <div className="flex justify-end -mt-1">
                          <button type="button" className="text-xs text-muted-foreground/60 hover:text-primary transition-colors font-display" onClick={() => setShowForgotPassword(true)}>
                            Esqueceu sua senha?
                          </button>
                        </div>
                      )}

                      {/* Submit */}
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold font-display text-sm shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:brightness-110 disabled:opacity-50 transition-all duration-300 relative overflow-hidden group"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/15 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <span className="relative z-10 flex items-center justify-center gap-2">
                          {isSubmitting ? (
                            <><Loader2 className="h-4 w-4 animate-spin" />{activeTab === 'signup' ? 'Cadastrando...' : 'Entrando...'}</>
                          ) : (
                            <>{activeTab === 'signup' ? 'Criar Conta' : 'Acessar Painel'}<Sparkles className="h-4 w-4 opacity-70" /></>
                          )}
                        </span>
                      </button>

                      {/* Divider */}
                      <div className="relative my-2">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-border/15" />
                        </div>
                        <div className="relative flex justify-center text-[11px]">
                          <span className="bg-card/30 backdrop-blur-sm px-4 text-muted-foreground/50 font-display uppercase tracking-wider">ou</span>
                        </div>
                      </div>

                      {/* Google Button */}
                      <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={isGoogleLoading || isSubmitting}
                        className="w-full h-[52px] rounded-2xl border border-border/20 bg-background/40 hover:bg-background/60 hover:border-border/30 text-foreground font-semibold font-display text-sm transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 backdrop-blur-sm"
                      >
                        {isGoogleLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <svg className="h-5 w-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                          </svg>
                        )}
                        {isGoogleLoading ? 'Conectando...' : 'Continuar com Google'}
                      </button>
                    </form>
                  </Form>
                </div>

                {/* Reseller CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mt-6"
                >
                  <button
                    onClick={() => navigate('/reseller/register')}
                    className="w-full flex items-center justify-center gap-3 px-5 py-4 rounded-2xl border border-primary/10 bg-primary/[0.03] hover:bg-primary/[0.07] hover:border-primary/20 transition-all duration-300 group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/10 flex items-center justify-center group-hover:from-primary/20 group-hover:to-accent/10 transition-all">
                      <KeyRound className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <div className="text-[13px] font-semibold text-foreground font-display">Programa de Revenda</div>
                      <div className="text-[11px] text-muted-foreground/60">Seja um revendedor autorizado →</div>
                    </div>
                  </button>
                </motion.div>

                {/* Security badge */}
                <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted-foreground/40">
                  <Shield className="h-3.5 w-3.5" />
                  <span className="font-display tracking-wide">Protegido com criptografia AES-256</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Animations */}
      <style>{`
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
