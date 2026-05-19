import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, TrendingUp, Shield, Users, Zap, DollarSign, ArrowRight, Star, ChevronDown, Check, MessageSquare, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const stats = [
  { value: '∞', label: 'Clientes sem limite de volume' },
  { value: '3', label: 'Passos para começar a lucrar' },
  { value: '0', label: 'Investimento inicial necessário' },
  { value: '100%', label: 'Sua marca, seus clientes' },
];

const benefits = [
  {
    icon: DollarSign,
    title: 'Lucro Garantido',
    description: 'Defina suas próprias margens de lucro e ganhe com cada licença vendida.',
    highlight: 'Margem livre',
  },
  {
    icon: Zap,
    title: 'Painel Exclusivo',
    description: 'Gerencie licenças, clientes e métricas em tempo real pelo seu painel.',
    highlight: 'Gestão completa',
  },
  {
    icon: Shield,
    title: 'Suporte Dedicado',
    description: 'Canal de suporte prioritário para revendedores aprovados.',
    highlight: 'Prioridade máxima',
  },
  {
    icon: Users,
    title: 'Sem Limite de Clientes',
    description: 'Venda para quantos clientes quiser, sem restrições de volume.',
    highlight: 'Escala ilimitada',
  },
  {
    icon: TrendingUp,
    title: 'Relatórios Detalhados',
    description: 'Acompanhe vendas, receita e crescimento com dashboards completos.',
    highlight: 'Dados em tempo real',
  },
  {
    icon: Star,
    title: 'Marca Própria',
    description: 'Revenda com a sua identidade e construa sua base de clientes.',
    highlight: 'White label',
  },
];

const steps = [
  { step: '01', title: 'Cadastre-se', description: 'Preencha o formulário de interesse com seus dados.' },
  { step: '02', title: 'Aprovação', description: 'Nossa equipe analisa e aprova seu cadastro rapidamente.' },
  { step: '03', title: 'Comece a Vender', description: 'Acesse o painel, gere licenças e comece a lucrar.' },
];

const testimonials = [
  {
    name: 'Carlos Almeida',
    role: 'Revendedor Premium',
    content: 'Em menos de uma semana já tinha recuperado o investimento. O painel facilita demais a gestão dos clientes.',
    avatar: 'CA',
  },
  {
    name: 'Juliana Santos',
    role: 'Agência Digital',
    content: 'Adicionei o Ilimitado Lov ao portfólio da minha agência e virou uma das maiores fontes de receita recorrente.',
    avatar: 'JS',
  },
  {
    name: 'Roberto Lima',
    role: 'Empreendedor',
    content: 'O suporte é excepcional e o processo de revenda é muito simples. Recomendo para quem quer uma renda extra.',
    avatar: 'RL',
  },
];

const plans = [
  {
    name: 'Starter',
    price: '197',
    description: 'Ideal para começar a revender',
    features: ['Painel de revendedor', 'Geração de licenças', 'Suporte por chat', 'Relatórios básicos'],
  },
  {
    name: 'Pro',
    price: '297',
    description: 'Preços menores por chave',
    features: ['Tudo do Starter', 'Preço reduzido por chave', 'Suporte prioritário', 'Relatórios avançados'],
    popular: true,
  },
  {
    name: 'Unlimited',
    price: '997',
    description: 'Chaves ilimitadas sem custo extra',
    features: ['Tudo do Pro', 'Chaves ilimitadas', 'Suporte VIP dedicado', 'Dashboard exclusivo'],
  },
];

export default function ResellerLanding() {
  const navigate = useNavigate();
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const nextTestimonial = useCallback(() => {
    setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
  }, []);

  useEffect(() => {
    const interval = setInterval(nextTestimonial, 5000);
    return () => clearInterval(interval);
  }, [nextTestimonial]);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-semibold">Ilimitado <span className="text-gradient">Lov</span></span>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <button onClick={() => scrollToSection('benefits')} className="text-muted-foreground hover:text-foreground transition-colors">
              Benefícios
            </button>
            <button onClick={() => scrollToSection('how')} className="text-muted-foreground hover:text-foreground transition-colors">
              Como Funciona
            </button>
            <button onClick={() => scrollToSection('pricing')} className="text-muted-foreground hover:text-foreground transition-colors">
              Planos
            </button>
          </div>
          <Button onClick={() => navigate('/auth')} className="bg-gradient text-primary-foreground h-9 px-5 text-sm font-medium hover:opacity-90 transition-opacity">
            Já sou Revendedor
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-[150px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[120px]" />
          <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full bg-primary/3 blur-[100px]" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="animate-fade-up-delay-1 mb-4">
            <Badge variant="outline" className="border-primary/30 text-primary text-sm px-4 py-1">
              Programa de Revendedores
            </Badge>
          </div>

          <h1 className="animate-fade-up-delay-1 text-5xl md:text-7xl font-semibold tracking-tight mb-6 leading-tight">
            Lucre revendendo
            <br />
            <span className="text-gradient">Ilimitado Lov</span>
          </h1>

          <p className="animate-fade-up-delay-2 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Torne-se um revendedor oficial e ganhe dinheiro vendendo licenças com sua própria margem de lucro.{' '}
            <span className="text-foreground font-medium">Sem investimento inicial.</span>
          </p>

          <div className="animate-fade-up-delay-3 flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <Button
              size="lg"
              className="bg-gradient text-primary-foreground h-14 px-10 text-base font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/20"
              onClick={() => navigate('/reseller/register')}
            >
              Quero ser Revendedor
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 px-8 text-base font-medium border-primary/30 hover:bg-primary/10 transition-all"
              onClick={() => scrollToSection('pricing')}
            >
              Ver Planos
            </Button>
          </div>

          <div className="animate-fade-up-delay-3 flex flex-wrap items-center justify-center gap-6 md:gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span>Sem investimento</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              <span>Suporte dedicado</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary" />
              <span>Aprovação rápida</span>
            </div>
          </div>
        </div>

        <button onClick={() => scrollToSection('stats')} className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground/50 hover:text-muted-foreground transition-colors animate-bounce">
          <ChevronDown className="h-6 w-6" />
        </button>
      </section>

      {/* Stats */}
      <section id="stats" className="py-20 px-6 border-y border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl md:text-5xl font-medium text-gradient mb-2">{stat.value}</div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[150px] -translate-x-1/2" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[120px] translate-x-1/2" />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-5xl font-semibold mb-6 leading-tight">
              Por que ser um{' '}
              <span className="text-gradient">revendedor</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Vantagens exclusivas para quem faz parte do programa
            </p>
          </div>

          {/* Main benefit highlighted */}
          <div className="mb-8 relative group">
            <div
              className="absolute -inset-2 rounded-[2rem] opacity-30 group-hover:opacity-50 blur-xl transition-opacity duration-500 animate-glow-rotate"
              style={{
                background: 'linear-gradient(135deg, hsl(224 76% 48%), hsl(200 80% 55%), hsl(260 70% 60%))',
                backgroundSize: '400% 400%',
              }}
            />
            <div className="relative p-10 rounded-3xl bg-card border border-border/50">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
                  <DollarSign className="h-10 w-10 text-primary-foreground" />
                </div>
                <div className="text-center md:text-left">
                  <h3 className="text-2xl md:text-3xl font-semibold mb-3">Lucro Garantido</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
                    Defina suas próprias margens de lucro. Compre licenças a preço de custo e revenda pelo valor que quiser. Sem limites de ganho.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.slice(1).map((benefit, index) => (
              <div
                key={index}
                className="group relative p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-subtle opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary/80 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors duration-300">
                      <benefit.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 pt-1">
                      <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-primary/80 mb-1">
                        {benefit.highlight}
                      </span>
                      <h3 className="text-base font-semibold">{benefit.title}</h3>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed pl-16">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <span className="inline-block text-primary text-sm font-medium tracking-wider uppercase mb-4">Processo</span>
            <h2 className="text-4xl md:text-5xl font-medium mb-6">
              Como <span className="text-gradient">funciona</span>
            </h2>
          </div>

          <div className="space-y-0">
            {steps.map((item, index) => (
              <div key={index} className="relative flex gap-6 pb-12 last:pb-0">
                {index < steps.length - 1 && <div className="absolute left-6 top-14 w-px h-full bg-border" />}
                <div className="relative z-10 w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="text-primary font-medium text-sm">{item.step}</span>
                </div>
                <div className="pt-2">
                  <h3 className="text-lg font-medium mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-32 px-6 border-y border-border/50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">
              O que dizem nossos <span className="text-gradient">revendedores</span>
            </h2>
          </div>

          <div className="text-center">
            <p className="text-xl md:text-2xl text-foreground/90 leading-relaxed mb-10 min-h-[80px]">
              "{testimonials[currentTestimonial].content}"
            </p>

            <div className="flex items-center justify-center gap-3 mb-12">
              <div className="w-10 h-10 rounded-full bg-gradient flex items-center justify-center">
                <span className="text-primary-foreground text-sm font-medium">{testimonials[currentTestimonial].avatar}</span>
              </div>
              <div className="text-left">
                <div className="font-medium text-sm">{testimonials[currentTestimonial].name}</div>
                <div className="text-muted-foreground text-xs">{testimonials[currentTestimonial].role}</div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentTestimonial
                      ? 'w-6 bg-primary'
                      : 'w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
        
        <div className="max-w-5xl mx-auto relative">
          <div className="text-center mb-16">
            <span className="inline-block text-primary text-sm font-medium tracking-wider uppercase mb-4">Investimento</span>
            <h2 className="text-4xl md:text-5xl font-medium mb-6">
              Escolha seu <span className="text-gradient">Plano</span>
            </h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Planos para cada nível de operação. Comece pequeno e escale conforme cresce.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div key={plan.name} className="relative group">
                {plan.popular && (
                  <>
                    <div
                      className="absolute -inset-2 rounded-[2rem] opacity-40 blur-xl animate-glow-rotate"
                      style={{
                        background: 'linear-gradient(135deg, hsl(224 76% 48%), hsl(200 80% 55%), hsl(260 70% 60%))',
                        backgroundSize: '400% 400%',
                      }}
                    />
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-20">
                      <span className="bg-gradient text-primary-foreground text-xs font-medium px-4 py-2 rounded-full">
                        Mais Popular
                      </span>
                    </div>
                  </>
                )}
                <div className={`relative bg-card rounded-3xl p-8 border ${plan.popular ? 'border-primary/30' : 'border-border/50'} h-full flex flex-col`}>
                  <h3 className="text-xl font-semibold mb-1">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                  <div className="flex items-baseline gap-1 mb-8">
                    <span className="text-muted-foreground text-lg">R$</span>
                    <span className="text-5xl font-medium text-gradient">{plan.price}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => navigate('/reseller/register')}
                    className={`w-full h-12 text-base font-medium ${
                      plan.popular
                        ? 'bg-gradient text-primary-foreground hover:opacity-90'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    } transition-all`}
                  >
                    Começar Agora
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[150px]" />
        </div>

        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-4xl md:text-5xl font-medium mb-8">
            Pronto para <span className="text-gradient">lucrar</span>?
          </h2>
          <p className="text-muted-foreground mb-10 max-w-lg mx-auto">
            Junte-se aos revendedores que já estão construindo uma fonte de renda recorrente com o Ilimitado Lov.
          </p>
          <Button
            onClick={() => navigate('/reseller/register')}
            size="lg"
            className="bg-gradient text-primary-foreground h-14 px-10 text-base font-medium hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            Cadastrar como Revendedor
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-primary" />
              Sem investimento inicial
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-primary" />
              Aprovação em 24h
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Suporte dedicado
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <span className="text-lg font-semibold opacity-60">Ilimitado Lov</span>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Ilimitado Lov • Todos os direitos reservados
          </p>
        </div>
      </footer>
    </div>
  );
}
