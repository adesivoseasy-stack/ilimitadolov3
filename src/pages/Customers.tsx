import { useState, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLicenses, LicenseWithDevice } from '@/hooks/useLicenses';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Search, User, Key, Mail } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Customer {
  email: string;
  licenses: LicenseWithDevice[];
  totalSpent: number;
  activeLicenses: number;
}

export default function Customers() {
  const { data: licenses, isLoading } = useLicenses();
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const customers = useMemo(() => {
    if (!licenses) return [];
    const customerMap = new Map<string, Customer>();
    licenses.forEach((license) => {
      const existing = customerMap.get(license.email);
      if (existing) {
        existing.licenses.push(license);
        existing.totalSpent += Number(license.price) || 0;
        if (license.status === 'active') existing.activeLicenses++;
      } else {
        customerMap.set(license.email, {
          email: license.email,
          licenses: [license],
          totalSpent: Number(license.price) || 0,
          activeLicenses: license.status === 'active' ? 1 : 0,
        });
      }
    });
    return Array.from(customerMap.values());
  }, [licenses]);

  const filteredCustomers = customers.filter((customer) =>
    customer.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-8 px-1 sm:px-0 pt-14 lg:pt-0">
        {/* Header */}
        <div className="animate-fade-up">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2 font-display">Gestão</p>
          <h1 className="text-4xl sm:text-5xl font-black text-gradient-white font-display leading-[1.1]">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-2">Clientes e licenças associadas</p>
        </div>

        {/* Search */}
        <div className="relative max-w-full sm:max-w-md animate-fade-up-delay-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por email..."
            className="pl-9 bg-card/40 border-border/30 focus:border-primary/30"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-up-delay-2">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Cliente</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Licenças</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Ativas</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Total Gasto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-display">Carregando...</TableCell></TableRow>
              ) : filteredCustomers.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-12 text-muted-foreground font-display">Nenhum cliente encontrado</TableCell></TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow
                    key={customer.email}
                    className="cursor-pointer border-border/10 hover:bg-primary/[0.03] transition-colors"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient shadow-lg shadow-primary/15">
                          <span className="text-xs font-bold text-primary-foreground font-display">
                            {customer.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[13px] font-medium font-display">{customer.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Key className="h-3.5 w-3.5 text-primary/60" />
                        <span className="font-bold font-display">{customer.licenses.length}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-success font-black font-display">{customer.activeLicenses}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold font-display text-foreground/80">R$ {customer.totalSpent.toFixed(2)}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Customer Details Dialog */}
        <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
          <DialogContent className="max-w-lg bg-card/95 backdrop-blur-xl border-border/30">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 font-display">
                <div className="h-9 w-9 rounded-xl bg-gradient flex items-center justify-center shadow-lg shadow-primary/20">
                  <Mail className="h-4 w-4 text-primary-foreground" />
                </div>
                {selectedCustomer?.email}
              </DialogTitle>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-5">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-border/20 bg-background/20 p-4 text-center">
                    <p className="text-3xl font-black font-display">{selectedCustomer.licenses.length}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display mt-1">Total</p>
                  </div>
                  <div className="rounded-xl border border-border/20 bg-background/20 p-4 text-center">
                    <p className="text-3xl font-black text-success font-display">{selectedCustomer.activeLicenses}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display mt-1">Ativas</p>
                  </div>
                  <div className="rounded-xl border border-border/20 bg-background/20 p-4 text-center">
                    <p className="text-3xl font-black text-primary font-display">R$ {selectedCustomer.totalSpent.toFixed(0)}</p>
                    <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display mt-1">Gasto</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground font-display mb-3">Licenças</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-none">
                    {selectedCustomer.licenses.map((license) => (
                      <div
                        key={license.id}
                        className="flex items-center justify-between rounded-xl border border-border/20 bg-background/20 p-3.5 hover:bg-primary/[0.03] transition-colors"
                      >
                        <div>
                          <p className="font-mono text-[13px] font-semibold text-foreground">{license.license_key}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Criada em {format(parseISO(license.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </p>
                        </div>
                        <StatusBadge status={license.status} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: { label: 'ATIVA', className: 'bg-success/15 text-success border-success/20' },
    expired: { label: 'EXP', className: 'bg-warning/15 text-warning border-warning/20' },
    revoked: { label: 'REV', className: 'bg-destructive/15 text-destructive border-destructive/20' },
  }[status] || { label: status, className: 'bg-muted text-muted-foreground border-border' };

  return (
    <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black font-display ${config.className}`}>
      {config.label}
    </span>
  );
}
