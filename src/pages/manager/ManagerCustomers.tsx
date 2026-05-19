import { ManagerLayout } from '@/components/manager/ManagerLayout';
import { useLicenses } from '@/hooks/useLicenses';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Monitor, Mail } from 'lucide-react';
import { useState, useMemo } from 'react';

export default function ManagerCustomers() {
  const { data: licenses, isLoading } = useLicenses();
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
    <ManagerLayout>
      <div className="space-y-6 px-1 sm:px-0 pt-12 lg:pt-0">
        <div>
          <h1 className="text-lg font-medium text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">Todos os clientes do sistema</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
        ) : customers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum cliente encontrado</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {customers.map((customer) => (
              <Card key={customer.email} className="border-border/50">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm truncate">{customer.email}</span>
                  </div>
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>{customer.licenses} licença(s)</span>
                    <span className="text-success">{customer.active} ativa(s)</span>
                    <span className="flex items-center gap-1"><Monitor className="h-3 w-3" />{customer.devices}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ManagerLayout>
  );
}
