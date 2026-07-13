import { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Phone, Coins, ShieldCheck, Zap, TrendingUp } from 'lucide-react';
import { z } from 'zod';
import logoImg from '@/assets/logo.webp';

const registerSchema = z.object({
  name: z.string().min(2, 'Nome muito curto').max(100),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  phone: z.string().max(20).optional(),
});

interface Props {
  onAuthenticated: () => void;
}

export function CreditosLogin({ onAuthenticated }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // register
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [registering, setRegistering] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [googleLoading, setGoogleLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;
    setLoggingIn(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    setLoggingIn(false);
    if (error) {
      toast({
        title: 'Falha no login',
        description: error.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : error.message,
        variant: 'destructive',
      });
      return;
    }
    onAuthenticated();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const validation = registerSchema.safeParse({ name, email, password, phone });
    if (!validation.success) {
      const fe: Record<string, string> = {};
      validation.error.errors.forEach((er) => {
        if (er.path[0]) fe[er.path[0] as string] = er.message;
      });
      setErrors(fe);
      return;
    }

    setRegistering(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/creditos`,
        data: { full_name: name },
      },
    });

    if (error) {
      setRegistering(false);
      toast({
        title: 'Erro no cadastro',
        description: error.message === 'User already registered' ? 'Este email já está cadastrado. Faça login.' : error.message,
        variant: 'destructive',
      });
      return;
    }

    // Confirma email automaticamente via edge function (bypass de verificação para /creditos)
    try {
      const { error: confirmErr } = await supabase.functions.invoke('confirm-credits-signup', {
        body: { email, name, phone },
      });
      if (confirmErr) throw confirmErr;
    } catch (err) {
      console.error('confirm-credits-signup error', err);
      setRegistering(false);
      toast({
        title: 'Erro ao ativar conta',
        description: 'Tente fazer login. Se persistir, contate o suporte.',
        variant: 'destructive',
      });
      return;
    }

    // Se já tem sessão, segue direto; senão faz login com email/senha
    if (!data.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
      if (signInErr) {
        setRegistering(false);
        toast({
          title: 'Conta criada!',
          description: 'Faça login para continuar.',
        });
        setTab('login');
        setLoginEmail(email);
        return;
      }
    } else {
      // Garante perfil quando já existe sessão (caso global auto-confirm volte a ser ativado)
      try {
        await supabase.functions.invoke('register-credits-customer', {
          body: { name, phone },
        });
      } catch (err) {
        console.error('register-credits-customer error', err);
      }
    }

    setRegistering(false);
    toast({ title: 'Conta criada!', description: 'Bem-vindo(a) à revenda de créditos Lovable.' });
    onAuthenticated();
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: `${window.location.origin}/creditos`,
      });
      if (result.error) {
        toast({ title: 'Erro Google', description: 'Não foi possível conectar com o Google.', variant: 'destructive' });
      }
      if (result.redirected) return;
    } catch {
      toast({ title: 'Erro', description: 'Falha na autenticação.', variant: 'destructive' });
    }
    setGoogleLoading(false);
  };

  const inputClass =
    'pl-10 h-12 rounded-xl bg-background/40 border-border/30 focus:border-primary/50 focus:bg-background/60 transition-all font-display';

  const benefits = [
    { icon: Zap, title: 'Entrega Instantânea', desc: 'Créditos liberados em minutos' },
    { icon: ShieldCheck, title: 'Pagamento Seguro', desc: 'PIX direto via gateway certificado' },
    { icon: TrendingUp, title: 'Melhores Preços', desc: 'Tabela competitiva por pacote' },
  ];

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-30%] left-[-15%] w-[700px] h-[700px] rounded-full bg-primary/[0.07] blur-[180px] animate-pulse-glow" />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-accent/[0.06] blur-[160px] animate-pulse-glow"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(265 80% 55% / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(265 80% 55% / 0.4) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      {/* Left brand */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative z-10 flex-col justify-between p-12 xl:p-16">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <img src={logoImg} alt="Logo" className="h-10 w-auto" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5">
            <Coins className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-medium uppercase tracking-[0.15em] text-primary font-display">
              Créditos Lovable
            </span>
          </div>
          <h1 className="text-5xl xl:text-6xl font-black text-foreground leading-[1.05] font-display">
            Recarregue
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient-shift">
              Créditos Lovable
            </span>
            <br />
            sem complicação
          </h1>
          <p className="text-base text-muted-foreground max-w-md leading-relaxed">
            Compre créditos para o seu workspace Lovable via PIX em segundos. Entrega automatizada e suporte direto.
          </p>

          <div className="flex flex-col gap-4 pt-4">
            {benefits.map((b, i) => (
              <motion.div
                key={b.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.12 }}
                className="flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
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

        <div className="text-[11px] text-muted-foreground/70">
          Pagamentos processados por gateway certificado · LGPD compliant
        </div>
      </div>

      <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-border/60 to-transparent relative z-10" />

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="w-full max-w-[440px]"
        >
          <div className="lg:hidden text-center mb-6">
            <img src={logoImg} alt="Logo" className="h-10 w-auto mx-auto mb-4" />
          </div>

          <div className="mb-6">
            <h2 className="text-3xl font-black text-foreground font-display leading-tight">
              Acesse sua
              <br />
              conta de créditos
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              Use o mesmo login do painel ou cadastre uma nova conta.
            </p>
          </div>

          <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-2xl p-6 shadow-2xl shadow-primary/5">
            {/* Google */}
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full h-12 rounded-xl bg-background/60 border border-border/40 hover:bg-background/80 transition-all duration-300 flex items-center justify-center gap-3 group disabled:opacity-50 mb-4"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-foreground font-display">
                    Continuar com Google
                  </span>
                </>
              )}
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-card/50 px-3 text-muted-foreground font-display">ou com email</span>
              </div>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as 'login' | 'register')}>
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="register">Cadastrar</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-display">
                      Email
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        type="email"
                        className={inputClass}
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="seu@email.com"
                        disabled={loggingIn}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-display">
                      Senha
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        type="password"
                        className={inputClass}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={loggingIn}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loggingIn}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold font-display text-sm shadow-lg shadow-primary/25 hover:brightness-110 disabled:opacity-50 transition-all duration-300"
                  >
                    {loggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </button>
                </form>
              </TabsContent>

              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-display">
                      Nome *
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        className={inputClass}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Seu nome"
                        disabled={registering}
                      />
                    </div>
                    {errors.name && <p className="text-xs text-destructive font-medium">{errors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-display">
                      Email *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        type="email"
                        className={inputClass}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="seu@email.com"
                        disabled={registering}
                      />
                    </div>
                    {errors.email && <p className="text-xs text-destructive font-medium">{errors.email}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-display">
                      Senha *
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        type="password"
                        className={inputClass}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={registering}
                      />
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive font-medium">{errors.password}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground font-display">
                      Telefone (opcional)
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                      <Input
                        className={inputClass}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(00) 00000-0000"
                        disabled={registering}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={registering}
                    className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold font-display text-sm shadow-lg shadow-primary/25 hover:brightness-110 disabled:opacity-50 transition-all duration-300"
                  >
                    {registering ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin inline" />
                        Criando conta...
                      </>
                    ) : (
                      'Criar conta'
                    )}
                  </button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
