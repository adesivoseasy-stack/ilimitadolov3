import { useState } from 'react';
import { ManagerLayout } from '@/components/manager/ManagerLayout';
import { useLicenses, useCreateLicense, useRenewLicense, useRevokeLicense, useResetDevice, useSetLicenseExpiry, useDeleteLicense, LicenseWithDevice } from '@/hooks/useLicenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Search, MoreHorizontal, RefreshCw, Ban, Monitor, CalendarDays, Copy, Eye, Trash2, User } from 'lucide-react';
import { format, parseISO, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export default function ManagerLicenses() {
  const { data: licenses, isLoading } = useLicenses();
  const createLicense = useCreateLicense();
  const renewLicense = useRenewLicense();
  const revokeLicense = useRevokeLicense();
  const resetDevice = useResetDevice();
  const setLicenseExpiry = useSetLicenseExpiry();
  const deleteLicense = useDeleteLicense();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedLicense, setSelectedLicense] = useState<LicenseWithDevice | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expiryEdit, setExpiryEdit] = useState<{ id: string; currentExpiry: string } | null>(null);
  const [newExpiryDays, setNewExpiryDays] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [newDuration, setNewDuration] = useState('30');
  const [newPrice, setNewPrice] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [isWildcard, setIsWildcard] = useState(false);

  const filteredLicenses = licenses?.filter((license) => {
    const s = search.toLowerCase();
    const matchesSearch =
      license.license_key.toLowerCase().includes(s) ||
      license.email.toLowerCase().includes(s) ||
      (license.creator_name || '').toLowerCase().includes(s);
    const matchesStatus = statusFilter === 'all' || license.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreate = async () => {
    if (!newEmail) return;
    const durationValue = parseFloat(newDuration);
    const isTestLicense = newDuration === '0.006944';
    await createLicense.mutateAsync({
      email: newEmail,
      durationDays: durationValue,
      price: newPrice ? parseFloat(newPrice) : undefined,
      notes: newNotes || undefined,
      isTestLicense,
      isWildcard,
    });
    setIsCreateOpen(false);
    setNewEmail('');
    setNewDuration('30');
    setNewPrice('');
    setNewNotes('');
    setIsWildcard(false);
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: 'Copiado!', description: 'Chave copiada para a área de transferência.' });
  };

  const handleSetExpiry = async () => {
    if (!expiryEdit || !newExpiryDays) return;
    const days = parseFloat(newExpiryDays);
    if (isNaN(days) || days <= 0) return;
    const newExpiry = new Date();
    newExpiry.setTime(newExpiry.getTime() + days * 24 * 60 * 60 * 1000);
    await setLicenseExpiry.mutateAsync({ licenseId: expiryEdit.id, newExpiresAt: newExpiry.toISOString() });
    setExpiryEdit(null);
    setNewExpiryDays('');
  };

  return (
    <ManagerLayout>
      <div className="space-y-6 px-1 sm:px-0 pt-12 lg:pt-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-medium text-foreground">Todas as Licenças</h1>
            <p className="text-sm text-muted-foreground">Gerencie todas as licenças do sistema</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Nova Licença</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Licença</DialogTitle>
                <DialogDescription>Gere uma nova chave de licença</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email do cliente</Label>
                  <Input id="email" type="email" placeholder="cliente@exemplo.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Duração</Label>
                  <div className="rounded-xl border border-border/20 bg-background/20 px-4 py-3 text-sm">
                    30 dias <span className="text-xs text-muted-foreground">(fixo — apenas chaves coringa têm duração diferente)</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price">Preço (R$)</Label>
                  <Input id="price" type="number" step="0.01" placeholder="0.00" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea id="notes" placeholder="Notas..." value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="wildcard" checked={isWildcard} onChange={(e) => setIsWildcard(e.target.checked)} className="rounded" />
                  <Label htmlFor="wildcard" className="text-sm">Licença Wildcard</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createLicense.isPending}>
                  {createLicense.isPending ? 'Criando...' : 'Criar Licença'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar por chave ou email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="rounded-md border border-input bg-background px-3 py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos os status</option>
            <option value="active">Ativas</option>
            <option value="expired">Expiradas</option>
            <option value="revoked">Revogadas</option>
          </select>
        </div>

        <div className="rounded-lg border border-border bg-card overflow-x-auto scrollbar-none">
          <Table>
             <TableHeader>
              <TableRow>
                <TableHead>Chave</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Criado por</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dispositivo</TableHead>
                <TableHead>Expira em</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
               {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : filteredLicenses?.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhuma licença encontrada</TableCell></TableRow>
              ) : (
                filteredLicenses?.map((license) => (
                  <TableRow key={license.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-mono">{license.license_key}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyKey(license.license_key)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>{license.email}</TableCell>
                    <TableCell>
                      {license.creator_name ? (
                        <span className="inline-flex items-center gap-1 rounded bg-accent/50 px-1.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                          <User className="h-3 w-3" />{license.creator_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sistema</span>
                      )}
                    </TableCell>
                    <TableCell><StatusBadge status={license.status} notes={license.notes} /></TableCell>
                    <TableCell>
                      {license.devices?.length > 0 ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Monitor className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-[100px]">{license.devices[0].device_name || 'Vinculado'}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Não vinculado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <ExpiryInfo expiresAt={license.expires_at} durationHours={license.duration_hours} firstActivatedAt={license.first_activated_at} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedLicense(license); setIsDetailsOpen(true); }}>
                            <Eye className="mr-2 h-4 w-4" />Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => renewLicense.mutate({ licenseId: license.id, durationDays: 30 })}>
                            <RefreshCw className="mr-2 h-4 w-4" />Renovar +30 dias
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setExpiryEdit({ id: license.id, currentExpiry: license.expires_at })}>
                            <CalendarDays className="mr-2 h-4 w-4" />Alterar expiração
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetDevice.mutate(license.id)}>
                            <Monitor className="mr-2 h-4 w-4" />Resetar dispositivo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => setRevokeConfirm(license.id)}>
                            <Ban className="mr-2 h-4 w-4" />Revogar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(license.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />Excluir
                          </DropdownMenuItem>
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
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Detalhes da Licença</DialogTitle></DialogHeader>
            {selectedLicense && (
              <div className="space-y-4">
                <div><Label className="text-muted-foreground">Chave</Label><p className="font-mono text-sm">{selectedLicense.license_key}</p></div>
                <div><Label className="text-muted-foreground">Email</Label><p>{selectedLicense.email}</p></div>
                <div><Label className="text-muted-foreground">Status</Label><p><StatusBadge status={selectedLicense.status} notes={selectedLicense.notes} /></p></div>
                <div><Label className="text-muted-foreground">Criada em</Label><p className="text-sm">{format(parseISO(selectedLicense.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p></div>
                <div><Label className="text-muted-foreground">Criado por</Label><p className="text-sm">{selectedLicense.creator_name || 'Sistema'}</p></div>
                <div><Label className="text-muted-foreground">Expira em</Label><p className="text-sm">{format(parseISO(selectedLicense.expires_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p></div>
                {selectedLicense.price != null && <div><Label className="text-muted-foreground">Preço</Label><p className="text-sm">R$ {Number(selectedLicense.price).toFixed(2)}</p></div>}
                {selectedLicense.notes && <div><Label className="text-muted-foreground">Observações</Label><p className="text-sm">{selectedLicense.notes}</p></div>}
                {selectedLicense.devices?.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Dispositivo</Label>
                    <p className="text-sm">{selectedLicense.devices[0].device_name || selectedLicense.devices[0].hwid}</p>
                    <p className="text-xs text-muted-foreground">Último acesso: {format(parseISO(selectedLicense.devices[0].last_seen_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Expiry Edit Dialog */}
        <Dialog open={!!expiryEdit} onOpenChange={(open) => { if (!open) { setExpiryEdit(null); setNewExpiryDays(''); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Alterar Expiração</DialogTitle>
              <DialogDescription>Defina uma nova data de expiração</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-4 gap-2">
                {[{ label: '7d', v: '7' }, { label: '30d', v: '30' }, { label: '90d', v: '90' }, { label: '365d', v: '365' }].map(o => (
                  <Button key={o.v} variant={newExpiryDays === o.v ? 'default' : 'outline'} size="sm" onClick={() => setNewExpiryDays(o.v)}>{o.label}</Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input type="number" placeholder="Dias..." value={!['7', '30', '90', '365'].includes(newExpiryDays) ? newExpiryDays : ''} onChange={(e) => setNewExpiryDays(e.target.value)} />
                <span className="text-xs text-muted-foreground">dias</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setExpiryEdit(null); setNewExpiryDays(''); }}>Cancelar</Button>
              <Button onClick={handleSetExpiry} disabled={!newExpiryDays}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Revoke Confirm */}
        <AlertDialog open={!!revokeConfirm} onOpenChange={(open) => !open && setRevokeConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revogar licença?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (revokeConfirm) revokeLicense.mutate(revokeConfirm); setRevokeConfirm(null); }}>Revogar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Confirm */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir licença?</AlertDialogTitle>
              <AlertDialogDescription>Esta ação é permanente e não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deleteConfirm) deleteLicense.mutate(deleteConfirm); setDeleteConfirm(null); }}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ManagerLayout>
  );
}

function StatusBadge({ status, notes }: { status: string; notes?: string | null }) {
  const isRenewed = status === 'expired' && notes?.includes('[Renovada');
  const config = isRenewed
    ? { label: 'RENOVADA', className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' }
    : {
        active: { label: 'Ativa', className: 'bg-success/10 text-success' },
        expired: { label: 'Expirada', className: 'bg-warning/10 text-warning' },
        revoked: { label: 'Revogada', className: 'bg-destructive/10 text-destructive' },
      }[status] || { label: status, className: 'bg-muted text-muted-foreground' };
  return <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${config.className}`}>{config.label}</span>;
}

function ExpiryInfo({ expiresAt, durationHours, firstActivatedAt }: { expiresAt: string; durationHours?: number | null; firstActivatedAt?: string | null }) {
  if (durationHours && !firstActivatedAt) {
    const totalMinutes = durationHours * 60;
    if (totalMinutes < 60) return <span className="text-xs text-muted-foreground">⏳ {Math.round(totalMinutes)}min (aguardando)</span>;
    const days = Math.round(durationHours / 24);
    return <span className="text-xs text-muted-foreground">⏳ {days}d (aguardando ativação)</span>;
  }
  const now = new Date();
  const expiry = parseISO(expiresAt);
  if (expiry < now) return <span className="text-xs text-destructive">Expirado</span>;
  const days = differenceInDays(expiry, now);
  if (days > 365) return <span className="text-xs text-muted-foreground">∞</span>;
  if (days > 0) return <span className="text-xs text-muted-foreground">{days}d</span>;
  const hours = differenceInHours(expiry, now);
  if (hours > 0) return <span className="text-xs text-warning">{hours}h</span>;
  const mins = differenceInMinutes(expiry, now);
  return <span className="text-xs text-destructive">{mins}min</span>;
}
