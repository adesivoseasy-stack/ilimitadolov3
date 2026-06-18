import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  KeyRound,
  Users,
  Blocks,
  Download,
  Settings,
  Code,
  Shield,
  BarChart3,
  Coins,
  Megaphone,
  Settings2,
  ShieldAlert,
  FolderGit2,
} from 'lucide-react';
import logoImg from '@/assets/logo.png';
import { useState } from 'react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/licenses', label: 'Licenças', icon: KeyRound },
  { href: '/customers', label: 'Clientes', icon: Users },
  { href: '/resellers', label: 'Revendedores', icon: Users },
  { href: '/managers', label: 'Gerentes', icon: Shield },
  { href: '/templates', label: 'Templates', icon: Blocks },
  { href: '/extension', label: 'Extensão', icon: Download },
  { href: '/extension-front', label: 'Front', icon: Code },
  { href: '/settings', label: 'Configurações', icon: Settings },
  { href: '/token-metrics', label: 'Tokens', icon: BarChart3 },
  { href: '/admin/lvb-credits', label: 'LVB Credits', icon: Coins },
  { href: '/admin/creditos-config', label: 'Créditos /creditos', icon: Settings2 },
  { href: '/admin/remarketing', label: 'Remarketing', icon: Megaphone },
  { href: '/admin/ip-audit', label: 'Auditoria IP', icon: ShieldAlert },
  { href: '/admin/project-audit', label: 'Auditoria Projetos', icon: FolderGit2 },
];

export function Sidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-5 left-5 z-50 lg:hidden p-3 rounded-2xl bg-card/80 backdrop-blur-2xl border border-primary/10 shadow-2xl shadow-primary/10 hover:border-primary/20 transition-all duration-300"
      >
        {isOpen ? <X className="h-4 w-4 text-foreground" /> : <Menu className="h-4 w-4 text-foreground" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-[270px] transition-transform duration-300 ease-out',
          'lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Sidebar background */}
        <div className="absolute inset-0 bg-background border-r border-border/30" />
        
        {/* Purple ambient glow */}
        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-primary/[0.04] to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-[200px] bg-gradient-to-t from-primary/[0.02] to-transparent pointer-events-none" />

        <div className="relative flex h-full flex-col">
          {/* Logo */}
          <div className="px-7 pt-8 pb-8">
            <img src={logoImg} alt="Ilimitado" className="h-9 w-auto" />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-none">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 px-3 mb-3">Menu</p>
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3.5 rounded-xl px-3.5 py-3 text-[13px] font-medium transition-all duration-200',
                    isActive
                      ? 'text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <>
                      <div className="absolute inset-0 bg-gradient rounded-xl shadow-lg shadow-primary/30 animate-[pulse_2.5s_ease-in-out_infinite]" />
                      <div className="absolute inset-0 rounded-xl overflow-hidden">
                        <div className="absolute inset-y-0 -left-1/2 w-1/2 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
                      </div>
                    </>
                  )}

                  {!isActive && (
                    <div className="absolute inset-0 rounded-xl bg-transparent group-hover:bg-primary/[0.06] transition-colors duration-200" />
                  )}

                  <Icon className={cn(
                    'relative h-[18px] w-[18px] shrink-0 transition-all duration-300',
                    isActive
                      ? 'group-hover:scale-110 group-hover:-rotate-6'
                      : 'group-hover:text-primary group-hover:scale-110'
                  )} />
                  <span className="relative truncate font-display transition-transform duration-300 group-hover:translate-x-0.5">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* User footer */}
          <div className="p-5 space-y-4">
            <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
            <div className="flex items-center gap-3 px-3">
              <div className="h-9 w-9 rounded-xl bg-gradient flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                <span className="text-sm font-bold text-primary-foreground font-display">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-foreground/90 truncate font-display">{user?.email?.split('@')[0]}</p>
                <p className="text-[10px] text-muted-foreground">Admin</p>
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
