import { useState, useEffect } from 'react';
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
import { Plus, Search, MoreHorizontal, Monitor, Copy, Eye, Coins, UserPen, RefreshCw, Ban, FlaskConical, Loader2, CheckCircle2 } from 'lucide-react';
import { format, parseISO, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useCreatePixOrder, usePixOrderPolling, PixOrderData } from '@/hooks/usePixOrder';
import { PixCustomerDialog, PixCustomerFormData } from '@/components/reseller/PixCustomerDialog';
import { PixQrCode } from '@/components/reseller/PixQrCode';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles } from 'lucide-react';

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
  const availableLifetime = ((credits as any)?.lifetime_credits_total || 0) - ((credits as any)?.lifetime_credits_used || 0);

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
  const [newLifetime, setNewLifetime] = useState(false);
  
  const [editNameLicense, setEditNameLicense] = useState<{ id: string; currentName: string } | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [renewDialog, setRenewDialog] = useState<{ licenseId: string; licenseKey: string } | null>(null);
  const [renewDays, setRenewDays] = useState('30');
  const [isTestOpen, setIsTestOpen] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testCustomerName, setTestCustomerName] = useState('');

  // PIX Renewal flow
  const queryClient = useQueryClient();
  const { createOrder: createPixOrder, isLoading: pixLoading, error: pixError } = useCreatePixOrder();
  const [renewPixLicense, setRenewPixLicense] = useState<{ id: string; key: string } | null>(null);
  const [renewPixCustomerOpen, setRenewPixCustomerOpen] = useState(false);
  const [renewPixOrder, setRenewPixOrder] = useState<PixOrderData | null>(null);
  const [renewPixModalOpen, setRenewPixModalOpen] = useState(false);
  const renewPixStatus = usePixOrderPolling(renewPixOrder?.order_id || null);

  // Regenerate lifetime key (no credit cost — same lifetime slot, new key)
  const [regenDialog, setRegenDialog] = useState<{ id: string; key: string } | null>(null);
  const [regenLoading, setRegenLoading] = useState(false);
  const [regenResult, setRegenResult] = useState<string | null>(null);

  const handleRegenerateLifetime = async () => {
    if (!regenDialog) return;
    setRegenLoading(true);
    try {
      const { data: newKey, error: keyErr } = await supabase.rpc('generate_license_key');
      if (keyErr || !newKey) throw keyErr || new Error('Falha ao gerar nova chave');

      // Wipe devices and sessions BEFORE swapping the key so old client loses access immediately
      const [{ error: sErr }, { error: dErr }] = await Promise.all([
        supabase.from('sessions').delete().eq('license_id', regenDialog.id).select(),
        supabase.from('devices').delete().eq('license_id', regenDialog.id).select(),
      ]);
      if (sErr) throw sErr;
      if (dErr) throw dErr;

      const { data: updated, error: upErr } = await supabase
        .from('licenses')
        .update({
          license_key: newKey as unknown as string,
          first_activated_at: null,
          status: 'active',
          messages_used: 0,
        })
        .eq('id', regenDialog.id)
        .select();
      if (upErr) throw upErr;
      if (!updated || updated.length === 0) throw new Error('Sem permissão para regenerar esta chave');

      // Best-effort log
      await supabase.from('license_logs').insert({
        license_id: regenDialog.id,
        action: 'regenerated_lifetime',
        details: { old_key: regenDialog.key, new_key: newKey } as any,
      });

      setRegenResult(newKey as unknown as string);
      queryClient.invalidateQueries({ queryKey: ['reseller-licenses'] });
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      toast({ title: 'Chave regenerada!', description: 'A chave antiga foi invalidada.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e?.message || 'Não foi possível regenerar.', variant: 'destructive' });
    } finally {
      setRegenLoading(false);
    }
  };

  const openRenewPix = (licenseId: string, licenseKey: string) => {
    setRenewPixLicense({ id: licenseId, key: licenseKey });
    setRenewPixOrder(null);
    setRenewPixCustomerOpen(true);
  };

  const handleRenewPixConfirm = async (customer: PixCustomerFormData) => {
    if (!renewPixLicense) return;
    setRenewPixCustomerOpen(false);
    const order = await createPixOrder(1, customer, false, false, false, false, { licenseId: renewPixLicense.id });
    if (order) {
      setRenewPixOrder(order);
      setRenewPixModalOpen(true);
    } else {
      toast({ title: 'Erro', description: pixError || 'Não foi possível gerar o PIX.', variant: 'destructive' });
    }
  };

  // On payment confirmation → invalidate license queries + notify
  useEffect(() => {
    if (renewPixStatus === 'paid' && renewPixOrder) {
      queryClient.invalidateQueries({ queryKey: ['reseller-licenses'] });
      queryClient.invalidateQueries({ queryKey: ['licenses'] });
      toast({ title: 'Renovada!', description: 'Pagamento confirmado. Nova chave gerada com +30 dias.' });
    }
  }, [renewPixStatus, renewPixOrder, queryClient, toast]);

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
    if (newLifetime) {
      if (availableLifetime <= 0) {
        toast({ title: 'Sem créditos vitalícios', description: 'Solicite créditos vitalícios ao administrador.', variant: 'destructive' });
        return;
      }
    } else if (availableCredits <= 0) {
      toast({ title: 'Sem créditos', description: 'Você não possui créditos disponíveis para gerar licenças.', variant: 'destructive' });
      return;
    }
    await createLicense.mutateAsync({
      email: newEmail, durationDays: durationValue,
      price: newPrice ? parseFloat(newPrice) : undefined,
      notes: newNotes || undefined, isTestLicense: false,
      isLifetime: newLifetime,
      customerName: newCustomerName || undefined,
    });
    setIsCreateOpen(false);
    setNewEmail(''); setNewDuration('30'); setNewPrice(''); setNewNotes(''); setNewCustomerName(''); setNewLifetime(false);
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
              {availableLifetime > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30">
                  ⚡ {availableLifetime} vitalícia{availableLifetime > 1 ? 's' : ''}
                </span>
              )}
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
                  {!newLifetime && (
                    <div><Label className="font-display text-xs uppercase tracking-wider">Duração (dias)</Label><Input type="number" placeholder="30" value={newDuration} onChange={(e) => setNewDuration(e.target.value)} className="bg-background/50 border-border/30" /></div>
                  )}
                  <div><Label className="font-display text-xs uppercase tracking-wider">Preço (R$)</Label><Input type="number" step="0.01" placeholder="0.00" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="bg-background/50 border-border/30" /></div>
                  <div><Label className="font-display text-xs uppercase tracking-wider">Observações</Label><Textarea placeholder="Notas..." value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="bg-background/50 border-border/30" /></div>
                  {availableLifetime > 0 && (
                    <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${newLifetime ? 'border-amber-500/50 bg-amber-500/[0.08]' : 'border-border/30 hover:border-amber-500/30'}`}>
                      <input type="checkbox" checked={newLifetime} onChange={(e) => setNewLifetime(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-amber-500" />
                      <div className="flex-1">
                        <p className="text-sm font-display font-bold text-foreground">⚡ Gerar Chave Vitalícia</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Usa 1 dos seus <strong className="text-amber-400">{availableLifetime}</strong> créditos vitalícios. A chave nunca expira.</p>
                      </div>
                    </label>
                  )}
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
                      <div className="flex items-center gap-2">
                        <ExpiryInfo expiresAt={license.expires_at} durationHours={license.duration_hours} firstActivatedAt={license.first_activated_at} />
                        {license.status === 'expired' && !license.license_key.startsWith('TESTE-') && (
                          <Button
                            size="sm"
                            onClick={() => openRenewPix(license.id, license.license_key)}
                            className="h-7 px-3 bg-gradient text-primary-foreground font-display text-[11px] font-bold shadow-md shadow-primary/20 hover:shadow-primary/30"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" /> Renovar R$34,90
                          </Button>
                        )}
                      </div>
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
                                  <DropdownMenuItem onClick={() => openRenewPix(license.id, license.license_key)}>
                                    <RefreshCw className="mr-2 h-4 w-4" />Renovar via PIX (R$ 34,90)
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator className="bg-border/20" />
                              <DropdownMenuItem onClick={() => resetDevice.mutate(license.id)}><Monitor className="mr-2 h-4 w-4" />Resetar device</DropdownMenuItem>
                              {license.is_wildcard && (
                                <DropdownMenuItem onClick={() => { setRegenResult(null); setRegenDialog({ id: license.id, key: license.license_key }); }}>
                                  <Sparkles className="mr-2 h-4 w-4 text-amber-400" />Regenerar chave vitalícia
                                </DropdownMenuItem>
                              )}
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

        {/* Regenerate Lifetime Key Dialog */}
        <Dialog open={!!regenDialog} onOpenChange={(open) => { if (!open) { setRegenDialog(null); setRegenResult(null); } }}>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-400" /> Regenerar Chave Vitalícia
              </DialogTitle>
              <DialogDescription>
                {regenResult
                  ? 'Nova chave gerada com sucesso. A anterior foi invalidada.'
                  : 'Uma nova chave será gerada e a atual será invalidada imediatamente — devices e sessões vinculadas serão apagados. Ideal para revender a mesma vitalícia por dia/semana. Sem custo de crédito.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              {!regenResult ? (
                <>
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-display">Chave atual</Label>
                    <p className="font-mono text-[13px] font-semibold line-through text-muted-foreground">{regenDialog?.key}</p>
                  </div>
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 text-xs text-amber-200/90">
                    ⚠️ O cliente atual perderá acesso imediatamente. Você receberá uma nova chave para revender.
                  </div>
                </>
              ) : (
                <div>
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-display">Nova chave</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="font-mono text-[14px] font-bold text-foreground bg-background/60 rounded-md px-3 py-2 flex-1">{regenResult}</code>
                    <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(regenResult); toast({ title: 'Copiado!' }); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              {!regenResult ? (
                <>
                  <Button variant="outline" onClick={() => setRegenDialog(null)} className="border-border/30" disabled={regenLoading}>Cancelar</Button>
                  <Button onClick={handleRegenerateLifetime} disabled={regenLoading} className="bg-gradient font-display">
                    {regenLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Regenerando...</> : <><Sparkles className="mr-2 h-4 w-4" />Confirmar regeneração</>}
                  </Button>
                </>
              ) : (
                <Button onClick={() => { setRegenDialog(null); setRegenResult(null); }} className="bg-gradient font-display">Fechar</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Renew PIX — customer data */}
        <PixCustomerDialog
          open={renewPixCustomerOpen}
          onClose={() => setRenewPixCustomerOpen(false)}
          onConfirm={handleRenewPixConfirm}
          loading={pixLoading}
          title={`Renovar ${renewPixLicense?.key || ''}`}
          description="R$ 34,90 por +30 dias. Informe seus dados para gerar o QR Code PIX."
          defaultEmail={user?.email || ''}
        />

        {/* Renew PIX — QR + polling */}
        <Dialog open={renewPixModalOpen} onOpenChange={(open) => { if (!open) { setRenewPixModalOpen(false); setRenewPixOrder(null); setRenewPixLicense(null); } }}>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display">Pagamento PIX — Renovação</DialogTitle>
              <DialogDescription>
                Chave <code className="font-mono text-xs">{renewPixLicense?.key}</code> — +30 dias após pagamento.
              </DialogDescription>
            </DialogHeader>
            {renewPixStatus === 'paid' ? (
              <div className="space-y-4 py-4 text-center">
                <CheckCircle2 className="h-16 w-16 text-success mx-auto" />
                <p className="text-lg font-bold font-display">Pagamento confirmado!</p>
                <p className="text-sm text-muted-foreground">A licença foi renovada por mais 30 dias e uma nova chave foi gerada.</p>
                <Button onClick={() => { setRenewPixModalOpen(false); setRenewPixOrder(null); setRenewPixLicense(null); }} className="bg-gradient text-primary-foreground w-full">Fechar</Button>
              </div>
            ) : renewPixOrder ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gradient">R$ {(renewPixOrder.amount_cents / 100).toFixed(2)}</p>
                </div>
                {(renewPixOrder.qr_code_image_url || renewPixOrder.qr_code_text) && (
                  <div className="flex justify-center">
                    <PixQrCode value={renewPixOrder.qr_code_text} imageUrl={renewPixOrder.qr_code_image_url} alt="QR Code PIX" className="w-48 h-48 rounded-lg border border-border" />
                  </div>
                )}
                {renewPixOrder.qr_code_text && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Código PIX (Copia e Cola)</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={renewPixOrder.qr_code_text} className="text-xs font-mono" />
                      <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(renewPixOrder.qr_code_text); toast({ title: 'Copiado!', description: 'Código PIX copiado.' }); }}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Aguardando pagamento...</span>
                </div>
              </div>
            ) : null}
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
