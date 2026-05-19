import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LogOut, Menu, X, LayoutDashboard, KeyRound, Users,
  Download, Loader2, GraduationCap, Store, Coins, Wrench, AlertTriangle, Lock,
} from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { useState } from 'react';
import { useResellerLicenses } from '@/hooks/useResellerLicenses';
import { useToast } from '@/hooks/use-toast';

const navItems: { href: string; label: string; icon: any; disabled?: boolean }[] = [
  { href: '/reseller/dashboard', label: 'Revendedor', icon: LayoutDashboard },
  { href: '/reseller/licenses', label: 'Licenças', icon: KeyRound },
  { href: '/reseller/customers', label: 'Clientes', icon: Users },
  { href: '/reseller/dashboard?tab=creditos_lovable', label: 'Créditos Lovable', icon: Coins },
  { href: '/reseller/dashboard?tab=aulas', label: 'Aulas', icon: GraduationCap },
];

export function ResellerSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const { data: licenses } = useResellerLicenses();
  const { toast } = useToast();
  const hasActivePaidLicense = (licenses || []).some(
    (l: any) => l.status === 'active' && l.max_messages == null
  );

  const EXTENSION_URL = '/ilimitado-lov-v8.1.0-release.zip';

  const downloadExtension = () => {
    if (isDownloading) return;
    if (!hasActivePaidLicense) {
      toast({
        title: 'Acesso bloqueado',
        description: 'Você precisa de pelo menos 1 chave comprada e ativa para baixar a extensão.',
        variant: 'destructive',
      });
      return;
    }
    setIsDownloading(true);
    try {
      const link = document.createElement('a');
      link.href = `${EXTENSION_URL}?t=${Date.now()}`;
      link.download = 'ilimitado-lov-v8.1.0-release.zip';
      link.target = '_blank';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-5 left-5 z-50 lg:hidden p-3 rounded-2xl bg-card/80 backdrop-blur-2xl border border-primary/10 shadow-2xl shadow-primary/10 hover:border-primary/20 transition-all duration-300"
      >
        {isOpen ? <X className="h-4 w-4 text-foreground" /> : <Menu className="h-4 w-4 text-foreground" />}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden" onClick={() => setIsOpen(false)} />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-[270px] transition-transform duration-300 ease-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="absolute inset-0 bg-background border-r border-border/30" />
        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />

        <div className="relative flex h-full flex-col">
          <div className="px-7 pt-8 pb-8">
            <img src={logoImg} alt="Ilimitado" className="h-9 w-auto" />
          </div>

          <div className="px-5 mb-5">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border bg-gradient-to-r from-primary/[0.12] to-accent/[0.08] border-primary/15">
              <div className="h-6 w-6 rounded-lg flex items-center justify-center bg-gradient">
                <Store className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="text-xs font-semibold tracking-wide font-display text-foreground/90">
                Revendedor
              </span>
            </div>
          </div>

          <div className="px-6 mb-2"><div className="h-px bg-border/30" /></div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-none py-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 px-3 mb-3 font-display">Menu</p>
            {navItems.map((item) => {
              const itemPath = item.href.split('?')[0];
              const itemParams = new URLSearchParams(item.href.split('?')[1] || '');
              const currentParams = new URLSearchParams(location.search);
              const isActive = item.href.includes('?')
                ? location.pathname === itemPath && currentParams.get('tab') === itemParams.get('tab')
                : location.pathname === item.href && !currentParams.get('tab');
              const Icon = item.icon;

              return item.disabled ? (
                <div
                  key={item.href}
                  className="group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-[13px] font-medium cursor-not-allowed opacity-50"
                >
                  <div className="absolute inset-0 rounded-xl bg-muted/30" />
                  <Icon className="relative h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                  <span className="relative truncate font-display text-muted-foreground">{item.label}</span>
                  <Badge variant="outline" className="relative ml-auto text-[9px] px-1.5 py-0.5 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
                    <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                    Manutenção
                  </Badge>
                </div>
              ) : (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <div className="absolute inset-0 rounded-xl shadow-lg bg-gradient shadow-primary/25" />
                  )}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-xl bg-transparent transition-colors duration-200 group-hover:bg-primary/[0.06]" />
                  )}
                  <Icon className={cn(
                    'relative h-[18px] w-[18px] shrink-0 transition-all duration-200',
                    isActive ? '' : 'group-hover:text-primary'
                  )} />
                  <span className="relative truncate font-display">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="px-4 pb-2">
            <button
              onClick={downloadExtension}
              disabled={isDownloading || !hasActivePaidLicense}
              title={!hasActivePaidLicense ? 'Adquira pelo menos 1 chave ativa para liberar' : undefined}
              className={cn(
                'group relative flex w-full items-center gap-3.5 rounded-xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200',
                hasActivePaidLicense
                  ? 'text-muted-foreground hover:text-foreground hover:bg-primary/[0.06]'
                  : 'text-muted-foreground/50 cursor-not-allowed opacity-60'
              )}
            >
              {isDownloading ? (
                <Loader2 className="h-[18px] w-[18px] shrink-0 animate-spin" />
              ) : !hasActivePaidLicense ? (
                <Lock className="h-[18px] w-[18px] shrink-0" />
              ) : (
                <Download className="h-[18px] w-[18px] shrink-0 transition-all duration-200 group-hover:text-primary" />
              )}
              <span className="truncate font-display">{isDownloading ? 'Baixando...' : 'Baixar Extensão'}</span>
              {!hasActivePaidLicense && (
                <Badge variant="outline" className="ml-auto text-[9px] px-1.5 py-0.5 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
                  Bloqueado
                </Badge>
              )}
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
            <div className="flex items-center gap-3 px-3">
              <div className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-lg bg-gradient shadow-primary/20">
                <span className="text-sm font-bold text-white font-display">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-foreground/90 truncate font-display">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] text-muted-foreground">Revendedor</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[13px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 rounded-xl transition-all duration-200 font-display"
              onClick={signOut}
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
