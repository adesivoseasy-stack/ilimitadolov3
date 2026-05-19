import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  Coins,
  Zap,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Clock,
  XCircle,
  Check,
  Star,
  Sparkles,
  ArrowRight,
  ChevronDown,
  MessageCircle,
  Lock,
  Wallet,
  Rocket,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import logoImg from '@/assets/logo.png';
import fb01 from '@/assets/feedbacks/fb01.png';
import fb02 from '@/assets/feedbacks/fb02.png';
import fb03 from '@/assets/feedbacks/fb03.png';
import fb04 from '@/assets/feedbacks/fb04.png';
import fb05 from '@/assets/feedbacks/fb05.png';
import fb06 from '@/assets/feedbacks/fb06.png';

const FEEDBACKS: { src: string; name: string; role: string }[] = [
  { src: fb01, name: "lucas's Lovable", role: 'Desenvolvedor Full-Stack' },
  { src: fb02, name: "marina's Lovable", role: 'Product Designer' },
  { src: fb03, name: "rafael's Lovable", role: 'Founder de SaaS' },
  { src: fb04, name: "camila's Lovable", role: 'Engenheira de Software' },
  { src: fb05, name: "pedro's Lovable", role: 'Indie Hacker' },
  { src: fb06, name: "juliana's Lovable", role: 'Freelancer No-Code' },
];

const DEFAULT_PACKAGES = [
  { credits: 100, price: 18.9 },
  { credits: 200, price: 25.9 },
  { credits: 300, price: 32.9 },
  { credits: 500, price: 45.9 },
  { credits: 1000, price: 99.9, badge: 'MAIS VENDIDO' },
  { credits: 2000, price: 189.9 },
  { credits: 3000, price: 269.9 },
  { credits: 5000, price: 439.9, badge: 'MELHOR PREÇO' },
];

const FAQS = [
  {
    q: 'Como recebo meus créditos?',
    a: 'Após o pagamento via PIX ser confirmado (em segundos), nossa automação injeta os créditos direto na sua conta Lovable. Você recebe um link para acompanhar tudo em tempo real.',
  },
  {
    q: 'Demora quanto para entregar?',
    a: 'A entrega é praticamente instantânea. Em média, do PIX confirmado até os créditos disponíveis, leva menos de 60 segundos.',
  },
  {
    q: 'Esses créditos são oficiais da Lovable?',
    a: 'Sim. Os créditos são depositados diretamente na sua conta oficial Lovable. Funcionam exatamente como uma compra feita pela própria plataforma.',
  },
  {
    q: 'Aceitam outros pagamentos?',
    a: 'No momento trabalhamos exclusivamente com PIX, garantindo a entrega mais rápida e o menor preço possível.',
  },
  {
    q: 'Tem algum compromisso ou mensalidade?',
    a: 'Não. Você compra apenas o que precisa, quando precisar. Sem assinaturas, sem fidelidade.',
  },
  {
    q: 'E se algo der errado com a entrega?',
    a: 'Garantia total. Se a entrega falhar por qualquer motivo, devolvemos seu dinheiro 100% via PIX em até 24h.',
  },
];

export default function CreditosLanding() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [prices, setPrices] = useState<Record<number, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('system_config')
        .select('key, value')
        .like('key', 'creditos_pkg_%');
      const map: Record<number, number> = {};
      DEFAULT_PACKAGES.forEach((p) => (map[p.credits] = p.price));
      (data || []).forEach((c: any) => {
        const credits = parseInt(c.key.replace('creditos_pkg_', ''));
        const v = parseFloat(c.value);
        if (credits && !Number.isNaN(v)) map[credits] = v;
      });
      setPrices(map);
    })();
  }, []);

  const goLogin = () => navigate('/creditos/login');

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Helmet>
        <title>Créditos Lovable — Recarga via PIX, entrega instantânea</title>
        <meta
          name="description"
          content="Pare de sofrer com a falta de créditos na Lovable. Recarregue via PIX em segundos com o melhor preço do Brasil."
        />
      </Helmet>

      {/* NAV */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logoImg} alt="Logo" className="h-8 w-auto" />
          </div>
          <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground font-medium">
            <a href="#precos" className="hover:text-foreground transition">Preços</a>
            <a href="#beneficios" className="hover:text-foreground transition">Benefícios</a>
            <a href="#como-funciona" className="hover:text-foreground transition">Como funciona</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <button
            onClick={goLogin}
            className="h-10 px-5 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/30 hover:brightness-110 transition flex items-center gap-2"
          >
            Entrar
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative pt-32 pb-24 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[600px] rounded-full bg-primary/[0.18] blur-[140px]" />
          <div className="absolute top-32 left-[10%] w-[400px] h-[400px] rounded-full bg-accent/[0.18] blur-[120px]" />
          <div className="absolute top-32 right-[10%] w-[400px] h-[400px] rounded-full bg-pink-500/[0.18] blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(hsl(265 80% 55% / 0.5) 1px, transparent 1px), linear-gradient(90deg, hsl(265 80% 55% / 0.5) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
              maskImage: 'radial-gradient(circle at 50% 30%, black 30%, transparent 75%)',
            }}
          />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-md mb-7"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
              Recarga oficial Lovable · Entrega na hora
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.02] mb-6"
          >
            Pare de sofrer com a
            <br />
            falta de créditos na{' '}
            <span className="bg-gradient-to-r from-primary via-accent to-pink-400 bg-clip-text text-transparent">
              Lovable.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-10"
          >
            Recargas direto na sua conta, contas PRO e pronta entrega
            <br className="hidden sm:block" />
            a preços que congelam seus créditos — tudo instantâneo.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14"
          >
            <button
              onClick={goLogin}
              className="h-14 px-8 rounded-full bg-gradient-to-r from-primary via-accent to-pink-500 text-primary-foreground font-bold text-base shadow-2xl shadow-primary/40 hover:shadow-primary/60 hover:scale-[1.02] transition-all flex items-center gap-2"
            >
              Usar sem limites
              <ArrowRight className="h-5 w-5" />
            </button>
            <a
              href="#precos"
              className="h-14 px-8 rounded-full bg-card/60 backdrop-blur-md border border-border/40 text-foreground font-semibold text-base hover:bg-card transition-all flex items-center gap-2"
            >
              Ver ofertas
            </a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto"
          >
            {[
              { icon: Zap, label: 'Entrega na hora' },
              { icon: ShieldCheck, label: 'Pagamento seguro' },
              { icon: TrendingUp, label: 'Menores preços' },
              { icon: Wallet, label: 'PIX em segundos' },
            ].map((b) => (
              <div
                key={b.label}
                className="px-4 py-3 rounded-2xl bg-card/40 backdrop-blur-md border border-border/30 flex items-center gap-2 justify-center"
              >
                <b.icon className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">{b.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PRECOS */}
      <section id="precos" className="relative py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/10 mb-5">
              <Sparkles className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                Oferta relâmpago — até 25% off
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight">
              Melhor preço e custo-benefício do{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Brasil
              </span>
            </h2>
            <p className="text-muted-foreground">Escolha o pacote ideal pro seu projeto. Sem mensalidade.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DEFAULT_PACKAGES.map((p, idx) => {
              const price = prices[p.credits] ?? p.price;
              const highlighted = p.badge === 'MAIS VENDIDO';
              return (
                <motion.div
                  key={p.credits}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.05 }}
                  className={`relative rounded-3xl p-6 backdrop-blur-md border transition-all hover:-translate-y-1 ${
                    highlighted
                      ? 'bg-gradient-to-b from-primary/15 to-accent/10 border-primary/50 shadow-2xl shadow-primary/20'
                      : 'bg-card/40 border-border/40 hover:border-primary/40'
                  }`}
                >
                  {p.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-accent text-[9px] font-black uppercase tracking-[0.15em] text-primary-foreground shadow-lg">
                      {p.badge}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                      <Coins className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      Créditos
                    </div>
                  </div>
                  <div className="text-2xl font-black mb-1">{p.credits.toLocaleString('pt-BR')}</div>
                  <div className="text-[11px] text-muted-foreground mb-4">na Lovable</div>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-xs text-muted-foreground">R$</span>
                    <span className="text-4xl font-black tracking-tight">
                      {price.toFixed(2).split('.')[0]}
                    </span>
                    <span className="text-lg font-bold text-muted-foreground">
                      ,{price.toFixed(2).split('.')[1]}
                    </span>
                  </div>
                  <button
                    onClick={goLogin}
                    className={`w-full h-11 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                      highlighted
                        ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/40 hover:brightness-110'
                        : 'bg-card hover:bg-muted text-foreground border border-border/40'
                    }`}
                  >
                    Comprar agora
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* PROBLEMA */}
      <section className="relative py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-destructive/30 bg-destructive/10 mb-5">
            <AlertTriangle className="h-3 w-3 text-destructive" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-destructive">
              Atenção
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black mb-3 tracking-tight">
            Você tá perdendo
            <br />
            <span className="text-destructive">tempo e dinheiro</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-10 max-w-2xl mx-auto">
            {[
              'Comprando créditos avulsos caros',
              'Pagando assinaturas grandes pra usar pouco',
              'Esperando promoções que nunca vêm',
              'Aguentando lentidão sem alternativa',
            ].map((t) => (
              <div
                key={t}
                className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/5 border border-destructive/20"
              >
                <XCircle className="h-4 w-4 text-destructive shrink-0" />
                <span className="text-sm text-foreground/90 text-left">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SOLUCAO */}
      <section id="beneficios" className="relative py-24 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-black mb-3 tracking-tight">
            Aqui você não tem esse problema
          </h2>
          <p className="text-sm text-muted-foreground mb-12">Você escolhe a sua.</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { icon: Zap, title: 'Use sem limite', desc: 'na hora' },
              { icon: ShieldCheck, title: 'Conta blindada', segura: 'segura', desc: 'segura' },
              { icon: Rocket, title: 'Pague pelo que usar', desc: 'só isso' },
            ].map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-3xl p-8 bg-card/40 backdrop-blur-md border border-border/40 hover:border-primary/40 transition-all"
              >
                <div className="h-14 w-14 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center mb-5">
                  <b.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-base font-bold mb-1">{b.title}</div>
                <div className="text-xs text-muted-foreground">{b.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PROVA SOCIAL */}
      <section className="relative py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 mb-5">
              <Star className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Quem usa, recomenda
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-3 tracking-tight">
              Quem usa, recomenda
            </h2>
            <p className="text-sm text-muted-foreground">
              Mais de 2.000 desenvolvedores brasileiros já recarregaram com a gente.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-10">
            {[
              { value: '2.314', label: 'Recargas entregues' },
              { value: '874', label: 'Clientes ativos' },
              { value: '4,9', label: 'Avaliação média' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-3xl p-6 bg-card/40 backdrop-blur-md border border-border/40 text-center"
              >
                <div className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {s.value}
                </div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider mt-2 font-semibold">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEEDBACKS.map((fb, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-3xl p-3 bg-card/40 backdrop-blur-md border border-border/40 hover:border-primary/40 transition-all overflow-hidden"
              >
                <img
                  src={fb.src}
                  alt={`Feedback de ${fb.name}`}
                  loading="lazy"
                  className="w-full h-auto rounded-2xl block"
                />
                <div className="flex items-center justify-between gap-2 px-2 pt-3 pb-1">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-foreground truncate">{fb.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{fb.role}</div>
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    {Array.from({ length: 5 }).map((_, k) => (
                      <Star key={k} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="text-center text-[11px] text-muted-foreground mt-6">
            Conversas reais do nosso grupo de clientes. Telefones omitidos por privacidade.
          </p>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="relative py-24 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 mb-5">
              <Check className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Top 1 em descomplicação
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-3 tracking-tight">
              Simples, direto e seguro
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
            {[
              { icon: Wallet, t: 'Escolha seu pacote' },
              { icon: Lock, t: 'Faça pagamento via PIX' },
              { icon: Zap, t: 'Confirmação automática' },
              { icon: Coins, t: 'Créditos na hora' },
            ].map((s, i) => (
              <div
                key={i}
                className="rounded-3xl p-5 bg-card/40 backdrop-blur-md border border-border/40 text-center"
              >
                <div className="h-12 w-12 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30 flex items-center justify-center mb-3">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-sm font-bold">{s.t}</div>
              </div>
            ))}
          </div>

          <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/30 backdrop-blur-md">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <div className="text-base font-bold flex items-center gap-2">
                  Garantia Vigente
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                    Le compete
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Se a entrega falhar por qualquer motivo, devolvemos 100% do valor via PIX em até 24h. Sem perguntas.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 mb-5">
              <MessageCircle className="h-3 w-3 text-primary" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                Tire suas dúvidas
              </span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black mb-3 tracking-tight">Principais Dúvidas</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((f, i) => (
              <div
                key={i}
                className="rounded-2xl bg-card/40 backdrop-blur-md border border-border/40 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-4 flex items-center justify-between gap-4 text-left hover:bg-card/60 transition"
                >
                  <span className="text-sm font-semibold">{f.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
                      openFaq === i ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">
                    {f.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative py-24 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight italic leading-[1.05] mb-8">
            Ou você continua
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-pink-400 bg-clip-text text-transparent not-italic">
              limitado...
            </span>
            <br />
            ou você usa <span className="not-italic">à vontade</span>
          </h2>

          <button
            onClick={goLogin}
            className="h-14 px-10 rounded-full bg-gradient-to-r from-primary via-accent to-pink-500 text-primary-foreground font-bold text-base shadow-2xl shadow-primary/40 hover:shadow-primary/60 hover:scale-[1.02] transition-all inline-flex items-center gap-2"
          >
            <Sparkles className="h-5 w-5" />
            Adquirir Recarga
          </button>
          <p className="text-xs text-muted-foreground mt-4">
            Pagamento processado via PIX · Entrega instantânea
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative pt-12 pb-8 px-4 sm:px-6 border-t border-border/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div
              className="text-6xl sm:text-8xl md:text-9xl font-black tracking-tight bg-gradient-to-b from-foreground/20 to-transparent bg-clip-text text-transparent select-none"
              aria-hidden
            >
              CRÉDITOS LVB
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={logoImg} alt="Logo" className="h-7 w-auto" />
              <span className="text-xs text-muted-foreground">
                © {new Date().getFullYear()} · Todos os direitos reservados
              </span>
            </div>
            <div className="flex items-center gap-5 text-xs text-muted-foreground">
              <a href="#precos" className="hover:text-foreground transition">Preços</a>
              <a href="#faq" className="hover:text-foreground transition">FAQ</a>
              <button onClick={goLogin} className="hover:text-foreground transition">Entrar</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
