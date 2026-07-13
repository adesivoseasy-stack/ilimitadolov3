import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Users,
  Coins,
  KeyRound,
  Monitor,
  Shield,
  Megaphone,
  AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import logoImg from '@/assets/logo.webp';
import { useState } from 'react';

const navItems: { href: string; label: string; icon: any; disabled?: boolean }[] = [
  { href: '/manager/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/manager/licenses', label: 'Licenças', icon: KeyRound },
  { href: '/manager/resellers', label: 'Revendedores', icon: Users },
  { href: '/manager/customers', label: 'Clientes', icon: Monitor },
  { href: '/manager/credits', label: 'Créditos', icon: Coins, disabled: true },
  { href: '/manager/remarketing', label: 'Remarketing', icon: Megaphone },
];

export function ManagerSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2.5 rounded-2xl bg-card/90 backdrop-blur-xl border border-border/50 shadow-xl shadow-black/20 hover:shadow-primary/10 transition-all duration-300"
      >
        {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-[240px] transition-transform duration-300 ease-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.08] via-transparent to-primary/[0.04] rounded-r-2xl" />
        <div className="absolute inset-0 bg-card/80 backdrop-blur-2xl border-r border-border/30 rounded-r-2xl" />

        <div className="relative flex h-full flex-col">
          {/* Logo */}
          <div className="px-5 pt-6 pb-5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img src={logoImg} alt="Ilimitado" className="relative h-8 w-auto" />
              </div>
            </div>
            <div className="mt-4 h-px bg-gradient-to-r from-primary/20 via-border/40 to-transparent" />
          </div>

          {/* Badge */}
          <div className="px-4 mb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/[0.08] border border-primary/10">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-medium text-primary">Manager</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-none">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              if (item.disabled) {
                return (
                  <div
                    key={item.href}
                    className="group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium cursor-not-allowed opacity-50"
                  >
                    <div className="absolute inset-0 rounded-xl bg-muted/30" />
                    <Icon className="relative h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="relative truncate text-muted-foreground">{item.label}</span>
                    <Badge variant="outline" className="relative ml-auto text-[9px] px-1.5 py-0.5 border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
                      <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
                      Manutenção
                    </Badge>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-200',
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <>
                      <div className="absolute inset-0 bg-gradient rounded-xl shadow-lg shadow-primary/25" />
                      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.08] to-transparent rounded-xl" />
                    </>
                  )}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-xl bg-muted/0 group-hover:bg-muted/50 transition-colors duration-200" />
                  )}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-white/80 rounded-full" />
                  )}
                  <Icon className={cn(
                    'relative h-4 w-4 shrink-0 transition-colors duration-200',
                    isActive ? '' : 'group-hover:text-primary'
                  )} />
                  <span className="relative truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User footer */}
          <div className="p-4 space-y-3">
            <div className="h-px bg-gradient-to-r from-transparent via-border/40 to-transparent" />
            <div className="px-3 py-2.5 rounded-xl bg-background/60 border border-border/20">
              <p className="text-[11px] text-muted-foreground/80 truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-[13px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-9 rounded-xl transition-all duration-200"
              onClick={signOut}
            >
              <LogOut className="mr-2.5 h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
