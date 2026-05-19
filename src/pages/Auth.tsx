import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, KeyRound, Lock, Mail, Shield, Zap, Globe, Sparkles, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';
import logoImg from '@/assets/logo.png';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Looping hero: letras de "Gestão de Licenças Inteligente" caem no chão,
 * depois "Lov 3.0" desce do topo e cresce no lugar.
 */
function HeroLoopingTitle() {
  const lines = ['Gestão de', 'Licenças', 'Inteligente'];
  const CYCLE = 6; // segundos por loop completo
  // Calcula stagger global por índice de letra (entre todas as linhas)
  let globalIdx = 0;
  const totalChars = lines.reduce((acc, l) => acc + l.replace(/\s/g, '').length, 0);

  return (
    <div
      className="relative w-full font-display font-black text-foreground"
      style={{ height: '13.5rem', perspective: '1000px' }}
    >
      {/* Letras caindo */}
      <div className="absolute inset-0 flex flex-col items-center justify-start gap-1 text-4xl lg:text-5xl xl:text-[3.5rem] leading-[1.08]">
        {lines.map((line, lineIdx) => (
          <div key={lineIdx} className="flex justify-center">
            {line.split('').map((ch, i) => {
              if (ch === ' ') {
                return <span key={i} className="inline-block w-3 lg:w-4" />;
              }
              const stagger = (globalIdx / totalChars) * 0.12;
              globalIdx += 1;
              const fallStart = 0.4 + stagger;
              const fallEnd = fallStart + 0.18;
              const rot = (Math.random() - 0.5) * 140;
              const drift = (Math.random() - 0.5) * 40;
              const isAccent = lineIdx === 1;
              return (
                <motion.span
                  key={i}
                  className={
                    isAccent
                      ? 'inline-block bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift'
                      : 'inline-block'
                  }
                  style={{ transformOrigin: '50% 50%', willChange: 'transform' }}
                  animate={{
                    y: [0, 0, 0, 220, 220, 220, 0],
                    x: [0, 0, 0, drift, drift, drift, 0],
                    rotate: [0, 0, 0, rot, rot, rot, 0],
                    opacity: [1, 1, 1, 1, 0, 0, 1],
                  }}
                  transition={{
                    duration: CYCLE,
                    times: [0, 0.35, fallStart, fallEnd, 0.62, 0.98, 1],
                    ease: ['linear', 'linear', 'easeIn', 'linear', 'linear', 'linear'],
                    repeat: Infinity,
                  }}
                >
                  {ch}
                </motion.span>
              );
            })}
          </div>
        ))}
      </div>

      {/* Logo original — desce do topo e cresce */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none"
        animate={{
          y: [-280, -280, -280, -280, 0, 0, -280],
          scale: [0.15, 0.15, 0.15, 0.15, 1, 1.05, 0.15],
          opacity: [0, 0, 0, 0, 1, 1, 0],
        }}
        transition={{
          duration: CYCLE,
          times: [0, 0.4, 0.6, 0.66, 0.82, 0.94, 1],
          ease: ['linear', 'linear', 'linear', 'easeOut', 'easeIn', 'easeIn'],
          repeat: Infinity,
        }}
      >
        <img
          src={logoImg}
          alt="Logo"
          className="h-28 lg:h-32 xl:h-36 w-auto drop-shadow-[0_0_40px_hsl(var(--primary)/0.55)]"
        />
      </motion.div>
    </div>
  );
}

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

const emailSchema = z.object({
  email: z.string().email('Email inválido'),
});

export default function Auth() {
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        toast({
          title: 'Cadastro recebido!',
          description: 'Sua conta foi criada e está aguardando aprovação de um administrador. Você receberá acesso assim que for aprovada.',
        });
        setActiveTab('login');
        form.reset();
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

                      {activeTab === 'signup' && (
                        <p className="text-[11px] text-center text-muted-foreground/60 font-display leading-relaxed pt-1">
                          Após o cadastro, sua conta ficará pendente até a aprovação de um administrador.
                        </p>
                      )}
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
