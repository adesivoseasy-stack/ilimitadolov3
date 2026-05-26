import { useState } from 'react';
import { ResellerLayout } from '@/components/reseller/ResellerLayout';
import { useResellerLicenses, useResellerCreateLicense, useUpdateCustomerName } from '@/hooks/useResellerLicenses';
import { useResellerCredits } from '@/hooks/useManagerData';
import { useResetDevice, useRenewLicense, useRevokeLicense, LicenseWithDevice } from '@/hooks/useLicenses';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Search, MoreHorizontal, Monitor, Copy, Eye, Coins, UserPen, RefreshCw, Ban, FlaskConical } from 'lucide-react';
import { format, parseISO, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function ResellerLicenses() {
  const { data: licenses, isLoading } = useResellerLicenses();
  const createLicense = useResellerCreateLicense();
  const updateCustomerName = useUpdateCustomerName();
  const renewLicense = useRenewLicense();
  const { user, isAdmin, isManager } = useAuth();
  const { data: credits } = useResellerCredits(user?.id);
  const resetDevice = useResetDevice();
  const revokeLicense = useRevokeLicense();
  const { toast } = useToast();

  const availableCredits = (credits?.credits_total || 0) - (credits?.credits_used || 0);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<LicenseWithDevice | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [newDuration, setNewDuration] = useState('30');
  const [newPrice, setNewPrice] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  
  const [editNameLicense, setEditNameLicense] = useState<{ id: string; currentName: string } | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [renewDialog, setRenewDialog] = useState<{ licenseId: string; licenseKey: string } | null>(null);
  const [renewDays, setRenewDays] = useState('30');
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testCustomerName, setTestCustomerName] = useState('');

  const hasActivePaidLicense = licenses?.some(
    (l) => l.status === 'active' && !l.license_key.startsWith('TESTE-') && !l.max_messages && !(l.duration_hours && l.duration_hours <= 0.17)
  ) ?? false;

  const WHITELIST_TEST_EMAILS = ['dimatheus.salvador@gmail.com'];
  const isWhitelisted = !!user?.email && WHITELIST_TEST_EMAILS.includes(user.email.toLowerCase());
  const canCreateTest = isAdmin || isManager || isWhitelisted || hasActivePaidLicense;

  const filteredLicenses = licenses?.filter((license) => {
    const matchesSearch =
      license.license_key.toLowerCase().includes(search.toLowerCase()) ||
      license.email.toLowerCase().includes(search.toLowerCase()) ||
      (license.customer_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || license.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async () => {
    if (!newEmail) return;
    const durationValue = parseFloat(newDuration);
    if (availableCredits <= 0) {
      toast({ title: 'Sem créditos', description: 'Você não possui créditos disponíveis para gerar licenças.', variant: 'destructive' });
      return;
    }
    await createLicense.mutateAsync({
      email: newEmail, durationDays: durationValue,
      price: newPrice ? parseFloat(newPrice) : (isLifetime ? 147.90 : undefined),
      notes: newNotes || undefined, isTestLicense: false,
      isLifetime,
      customerName: newCustomerName || undefined,
    });
    setIsCreateOpen(false);
    setNewEmail(''); setNewDuration('30'); setNewPrice(''); setNewNotes(''); setNewCustomerName(''); setIsLifetime(false);
  };

  const handleCreateTest = async () => {
    if (!testEmail.trim()) return;
    await createLicense.mutateAsync({
      email: testEmail, durationDays: 0.006944,
      isTestLicense: true,
      customerName: testCustomerName || undefined,
    });
    setIsTestOpen(false);
    setTestEmail(''); setTestCustomerName('');
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: 'Copiado!', description: 'Chave copiada.' });
  };

  const handleSaveCustomerName = async () => {
    if (!editNameLicense) return;
    await updateCustomerName.mutateAsync({ licenseId: editNameLicense.id, customerName: editNameValue });
    setEditNameLicense(null); setEditNameValue('');
  };

  return (
    <ResellerLayout>
      <div className="space-y-8 px-1 sm:px-0 pt-14 lg:pt-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2 font-display">Gestão</p>
            <h1 className="text-4xl sm:text-5xl font-black text-gradient-white font-display leading-[1.1]">Licenças</h1>
            <p className="text-sm text-muted-foreground mt-2">Gerencie as licenças criadas por você</p>
            <div className="flex items-center gap-1.5 mt-3 text-xs font-display">
              <Coins className="h-3.5 w-3.5 text-muted-foreground" />
              <span className={availableCredits <= 0 ? 'text-destructive font-bold' : 'text-success font-bold'}>
                {availableCredits} disponíveis
              </span>
              <span className="text-muted-foreground">/ {credits?.credits_total || 0} total</span>
            </div>
          </div>
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      variant="outline"
                      className="border-border/30 font-display"
                      onClick={() => canCreateTest && setIsTestOpen(true)}
                      disabled={!canCreateTest}
                    >
                      <FlaskConical className="mr-2 h-4 w-4" />Chave Teste
                    </Button>
                  </span>
                </TooltipTrigger>
                {!canCreateTest && (
                  <TooltipContent>
                    <p>Adquira sua primeira chave para liberar a geração de testes</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient shadow-lg shadow-primary/20 font-display"><Plus className="mr-2 h-4 w-4" />Nova Licença</Button>
              </DialogTrigger>
              <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30">
                <DialogHeader>
                  <DialogTitle className="font-display">Criar Nova Licença</DialogTitle>
                  <DialogDescription>Gere uma nova chave de licença</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div><Label className="font-display text-xs uppercase tracking-wider">Nome do cliente</Label><Input placeholder="Ex: João Silva" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} className="bg-background/50 border-border/30" /></div>
                  <div><Label className="font-display text-xs uppercase tracking-wider">Email do cliente</Label><Input type="email" placeholder="cliente@exemplo.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-background/50 border-border/30" /></div>
                  <div>
                    <Label className="font-display text-xs uppercase tracking-wider">Duração</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setIsLifetime(false); if (!newPrice) setNewPrice(''); }}
                        className={`rounded-xl border px-3 py-3 text-sm font-display transition-all ${!isLifetime ? 'border-primary/60 bg-primary/10 text-foreground' : 'border-border/20 bg-background/20 text-muted-foreground hover:border-border/40'}`}
                      >
                        <div className="font-bold">30 dias</div>
                        <div className="text-[10px] uppercase tracking-wider opacity-70">Mensal</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsLifetime(true); setNewPrice('147.90'); }}
                        className={`rounded-xl border px-3 py-3 text-sm font-display transition-all ${isLifetime ? 'border-primary/60 bg-primary/10 text-foreground' : 'border-border/20 bg-background/20 text-muted-foreground hover:border-border/40'}`}
                      >
                        <div className="font-bold">Vitalícia ∞</div>
                        <div className="text-[10px] uppercase tracking-wider opacity-70">R$ 147,90</div>
                      </button>
                    </div>
                  </div>
                  <div><Label className="font-display text-xs uppercase tracking-wider">Preço (R$)</Label><Input type="number" step="0.01" placeholder="0.00" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="bg-background/50 border-border/30" /></div>
                  <div><Label className="font-display text-xs uppercase tracking-wider">Observações</Label><Textarea placeholder="Notas..." value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="bg-background/50 border-border/30" /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="border-border/30">Cancelar</Button>
                  <Button onClick={handleCreate} disabled={createLicense.isPending} className="bg-gradient font-display">{createLicense.isPending ? 'Criando...' : 'Criar Licença'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row animate-fade-up-delay-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por chave, email ou cliente..." className="pl-9 bg-card/40 border-border/30 focus:border-primary/30" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm px-3 py-2 text-sm font-display" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos</option>
            <option value="active">Ativas</option>
            <option value="expired">Expiradas</option>
            <option value="revoked">Revogadas</option>
          </select>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-x-auto scrollbar-none animate-fade-up-delay-2">
          <Table>
            <TableHeader>
              <TableRow className="border-border/20 hover:bg-transparent">
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Chave</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Cliente</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Email</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Status</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Device</TableHead>
                <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Expira</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-display">Carregando...</TableCell></TableRow>
              ) : filteredLicenses?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground font-display">Nenhuma licença encontrada</TableCell></TableRow>
              ) : (
                filteredLicenses?.map((license) => (
                  <TableRow key={license.id} className="border-border/10 hover:bg-primary/[0.03] transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-[13px] font-mono font-semibold text-foreground">{license.license_key}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10" onClick={() => handleCopyKey(license.license_key)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell><span className="text-[13px] font-display">{license.customer_name || <span className="text-muted-foreground italic">—</span>}</span></TableCell>
                    <TableCell className="text-[13px] font-display">{license.email}</TableCell>
                    <TableCell><StatusBadge status={license.status} notes={license.notes} /></TableCell>
                    <TableCell>
                      {license.devices?.length > 0 ? (
                        <div className="flex items-center gap-1.5 text-sm font-display">
                          <Monitor className="h-4 w-4 text-primary/50" />
                          <span className="truncate max-w-[100px]">{license.devices[0].device_name || 'Vinculado'}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm font-display">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ExpiryInfo expiresAt={license.expires_at} durationHours={license.duration_hours} firstActivatedAt={license.first_activated_at} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-border/30">
                          <DropdownMenuItem onClick={() => { setSelectedLicense(license); setIsDetailsOpen(true); }}><Eye className="mr-2 h-4 w-4" />Ver detalhes</DropdownMenuItem>
                          {!license.license_key.startsWith('TESTE-') && (
                            <>
                              <DropdownMenuItem onClick={() => { setEditNameLicense({ id: license.id, currentName: license.customer_name || '' }); setEditNameValue(license.customer_name || ''); }}><UserPen className="mr-2 h-4 w-4" />Editar cliente</DropdownMenuItem>
                              {license.status === 'expired' && (
                                <>
                                  <DropdownMenuSeparator className="bg-border/20" />
                                  <DropdownMenuItem onClick={() => { setRenewDialog({ licenseId: license.id, licenseKey: license.license_key }); setRenewDays('30'); }}>
                                    <RefreshCw className="mr-2 h-4 w-4" />Renovar +30 dias
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator className="bg-border/20" />
                              <DropdownMenuItem onClick={() => resetDevice.mutate(license.id)}><Monitor className="mr-2 h-4 w-4" />Resetar device</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-md bg-card/95 backdrop-blur-xl border-border/30">
            <DialogHeader><DialogTitle className="font-display">Detalhes da Licença</DialogTitle></DialogHeader>
            {selectedLicense && (
              <div className="space-y-4">
                <div><Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-display">Chave</Label><p className="font-mono text-[13px] font-semibold">{selectedLicense.license_key}</p></div>
                <div><Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-display">Cliente</Label><p className="font-display">{selectedLicense.customer_name || '—'}</p></div>
                <div><Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-display">Email</Label><p className="font-display">{selectedLicense.email}</p></div>
                <div><Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-display">Status</Label><p><StatusBadge status={selectedLicense.status} /></p></div>
                <div><Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-display">Criada em</Label><p className="text-sm font-display">{format(parseISO(selectedLicense.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p></div>
                <div><Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-display">Expira em</Label><p className="text-sm font-display">{format(parseISO(selectedLicense.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p></div>
                {selectedLicense.notes && <div><Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-display">Observações</Label><p className="text-sm">{selectedLicense.notes}</p></div>}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Customer Name Dialog */}
        <Dialog open={!!editNameLicense} onOpenChange={(open) => { if (!open) { setEditNameLicense(null); setEditNameValue(''); } }}>
          <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border-border/30">
            <DialogHeader>
              <DialogTitle className="font-display">Editar Nome do Cliente</DialogTitle>
              <DialogDescription>Identificação do cliente</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input placeholder="Nome do cliente..." value={editNameValue} onChange={(e) => setEditNameValue(e.target.value)} className="bg-background/50 border-border/30" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditNameLicense(null); setEditNameValue(''); }} className="border-border/30">Cancelar</Button>
              <Button onClick={handleSaveCustomerName} disabled={updateCustomerName.isPending} className="bg-gradient font-display">{updateCustomerName.isPending ? 'Salvando...' : 'Salvar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Renew Dialog */}
        <Dialog open={!!renewDialog} onOpenChange={() => setRenewDialog(null)}>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30">
            <DialogHeader>
              <DialogTitle className="font-display">Renovar Licença</DialogTitle>
              <DialogDescription>
                A chave <code className="font-mono text-xs">{renewDialog?.licenseKey}</code> está vencida. Ao renovar por 30 dias, 1 crédito (valor da licença) será consumido e uma nova chave será gerada.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRenewDialog(null)} className="border-border/30">Cancelar</Button>
              <Button onClick={() => { if (renewDialog) { renewLicense.mutate({ licenseId: renewDialog.licenseId, durationDays: 30 }); setRenewDialog(null); } }} disabled={renewLicense.isPending} className="bg-gradient font-display">{renewLicense.isPending ? 'Renovando...' : 'Renovar +30 dias'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Test License Dialog */}
        <Dialog open={isTestOpen} onOpenChange={setIsTestOpen}>
          <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border-border/30">
            <DialogHeader>
              <DialogTitle className="font-display">Criar Chave Teste</DialogTitle>
              <DialogDescription>Chave de 10 minutos, sem custo de crédito. Expira automaticamente.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div><Label className="font-display text-xs uppercase tracking-wider">Nome do cliente</Label><Input placeholder="Ex: João Silva" value={testCustomerName} onChange={(e) => setTestCustomerName(e.target.value)} className="bg-background/50 border-border/30" /></div>
              <div><Label className="font-display text-xs uppercase tracking-wider">Email do cliente</Label><Input type="email" placeholder="cliente@exemplo.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="bg-background/50 border-border/30" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsTestOpen(false)} className="border-border/30">Cancelar</Button>
              <Button onClick={handleCreateTest} disabled={createLicense.isPending || !testEmail.trim()} className="bg-gradient font-display">{createLicense.isPending ? 'Criando...' : 'Criar Teste'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ResellerLayout>
  );
}

function StatusBadge({ status, notes }: { status: string; notes?: string | null }) {
  const isRenewed = status === 'expired' && notes?.includes('[Renovada');
  const config = isRenewed
    ? { label: 'RENOVADA', className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' }
    : {
        active: { label: 'ATIVA', className: 'bg-success/15 text-success border-success/20' },
        expired: { label: 'EXPIRADA', className: 'bg-warning/15 text-warning border-warning/20' },
        revoked: { label: 'REV', className: 'bg-destructive/15 text-destructive border-destructive/20' },
      }[status] || { label: status, className: 'bg-muted text-muted-foreground border-border' };
  return <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black font-display ${config.className}`}>{config.label}</span>;
}

function ExpiryInfo({ expiresAt, durationHours, firstActivatedAt }: { expiresAt: string; durationHours?: number | null; firstActivatedAt?: string | null }) {
  if (durationHours && !firstActivatedAt) {
    const totalMinutes = durationHours * 60;
    if (totalMinutes < 60) return <span className="text-xs text-muted-foreground font-display">⏳ {Math.round(totalMinutes)}min</span>;
    const days = Math.round(durationHours / 24);
    return <span className="text-xs text-muted-foreground font-display">⏳ {days}d (aguardando)</span>;
  }
  const now = new Date();
  const expiry = parseISO(expiresAt);
  if (expiry < now) return <span className="text-xs text-destructive font-bold font-display">Expirado</span>;
  const days = differenceInDays(expiry, now);
  if (days > 365) return <span className="text-xs text-muted-foreground font-display">∞</span>;
  if (days > 0) return <span className="text-xs text-muted-foreground font-bold font-display">{days}d</span>;
  const hours = differenceInHours(expiry, now);
  if (hours > 0) return <span className="text-xs text-warning font-bold font-display">{hours}h</span>;
  const mins = differenceInMinutes(expiry, now);
  return <span className="text-xs text-destructive font-bold font-display">{mins}min</span>;
}
