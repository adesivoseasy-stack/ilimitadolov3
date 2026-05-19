import { ResellerLayout } from '@/components/reseller/ResellerLayout';
import { useResellerLicenses } from '@/hooks/useResellerLicenses';
import { Input } from '@/components/ui/input';
import { Search, Monitor, Mail } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function ResellerCustomers() {
  const { data: licenses, isLoading } = useResellerLicenses();
  const [search, setSearch] = useState('');

  const customers = useMemo(() => {
    if (!licenses) return [];
    const map = new Map<string, { email: string; licenses: number; active: number; devices: number }>();
    licenses.forEach((l) => {
      const existing = map.get(l.email) || { email: l.email, licenses: 0, active: 0, devices: 0 };
      existing.licenses++;
      if (l.status === 'active') existing.active++;
      existing.devices += l.devices?.length || 0;
      map.set(l.email, existing);
    });
    return Array.from(map.values()).filter(c =>
      c.email.toLowerCase().includes(search.toLowerCase())
    );
  }, [licenses, search]);

  return (
    <ResellerLayout>
      <div className="space-y-8 px-1 sm:px-0 pt-14 lg:pt-0">
        <div className="animate-fade-up">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2 font-display">Gestão</p>
          <h1 className="text-4xl sm:text-5xl font-black text-gradient-white font-display leading-[1.1]">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-2">Clientes vinculados às suas licenças</p>
        </div>

        <div className="relative animate-fade-up-delay-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por email..." className="pl-9 bg-card/40 border-border/30 focus:border-primary/30" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12 font-display">Carregando...</p>
        ) : customers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12 font-display">Nenhum cliente encontrado</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-fade-up-delay-2">
            {customers.map((customer) => (
              <div key={customer.email} className="glass-card-hover rounded-2xl p-5 group">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient flex items-center justify-center shrink-0 shadow-lg shadow-primary/15">
                      <span className="text-xs font-bold text-primary-foreground font-display">{customer.email.charAt(0).toUpperCase()}</span>
                    </div>
                    <span className="text-[13px] truncate font-semibold font-display">{customer.email}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground pl-12 font-display">
                    <span><span className="font-bold text-foreground">{customer.licenses}</span> licença(s)</span>
                    <span className="text-success"><span className="font-bold">{customer.active}</span> ativa(s)</span>
                    <span className="flex items-center gap-1"><Monitor className="h-3 w-3" />{customer.devices}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ResellerLayout>
  );
}
