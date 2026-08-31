import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useLicenses, useRevokeLicense, useDeleteLicense, useResetDevice, useCreateLicense, useRenewLicense, useSetLicenseExpiry, useArchiveLicense, useReactivateLicense, useSetLicensePlan } from '@/hooks/useLicenses';
import { useOnlineUsers } from '@/hooks/useOnlineUsers';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { Key, MoreHorizontal, Ban, Trash2, RotateCcw, Copy, RefreshCw, Plus, Calendar, Infinity, Search, Wifi, Archive, ArchiveRestore } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Licenses() {
  const { data: licenses, isLoading } = useLicenses();
  const { data: onlineUsers } = useOnlineUsers();
  const revokeMutation = useRevokeLicense();
  const deleteMutation = useDeleteLicense();
  const resetDeviceMutation = useResetDevice();
  const renewMutation = useRenewLicense();
  const createMutation = useCreateLicense();
  const setExpiryMutation = useSetLicenseExpiry();
  const archiveMutation = useArchiveLicense();
  const reactivateMutation = useReactivateLicense();
  const setPlanMutation = useSetLicensePlan();

  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [onlineDialog, setOnlineDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'revoke' | 'delete' | 'reset'; licenseId: string; licenseKey: string } | null>(null);
  const [createDialog, setCreateDialog] = useState(false);
  const [renewDialog, setRenewDialog] = useState<{ licenseId: string; licenseKey: string } | null>(null);
  const [expiryDialog, setExpiryDialog] = useState<{ licenseId: string; licenseKey: string; currentExpiry: string } | null>(null);
  const [planDialog, setPlanDialog] = useState<{ licenseId: string; licenseKey: string; currentPlan: string } | null>(null);

  const [newEmail, setNewEmail] = useState('');
  const [newDuration, setNewDuration] = useState('30');
  const [newPrice, setNewPrice] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newIsWildcard, setNewIsWildcard] = useState(false);
  const [newPlan, setNewPlan] = useState<'basico' | 'plus' | 'pro' | 'fundador'>('basico');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [changePlan, setChangePlan] = useState<'basico' | 'plus' | 'pro' | 'fundador'>('basico');

  const filteredLicenses = (licenses || []).filter((license) => {
    if (!showArchived && license.status === 'archived') return false;
    return (
      license.license_key.toLowerCase().includes(search.toLowerCase()) ||
      license.email.toLowerCase().includes(search.toLowerCase())
    );
  });

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    const { type, licenseId } = confirmDialog;
    try {
      if (type === 'revoke') await revokeMutation.mutateAsync(licenseId);
      else if (type === 'delete') await deleteMutation.mutateAsync(licenseId);
      else if (type === 'reset') await resetDeviceMutation.mutateAsync(licenseId);
    } catch (e) {}
    setConfirmDialog(null);
  };

  const handleCreate = async () => {
    if (!newEmail) return;
    try {
      await createMutation.mutateAsync({
        email: newEmail,
        durationDays: newIsWildcard ? 36500 : 30,
        price: parseFloat(newPrice) || 0,
        notes: newNotes || undefined,
        isWildcard: newIsWildcard,
        plan: newPlan,
      });
      setCreateDialog(false);
      setNewEmail(''); setNewDuration('30'); setNewPrice(''); setNewNotes(''); setNewIsWildcard(false); setNewPlan('basico');
    } catch (e) {}
  };

  const handleRenew = async (days: number) => {
    if (!renewDialog) return;
    try { await renewMutation.mutateAsync({ licenseId: renewDialog.licenseId, durationDays: days }); } catch (e) {}
    setRenewDialog(null);
  };

  const handleSetExpiry = async () => {
    if (!expiryDialog || !newExpiryDate) return;
    try { await setExpiryMutation.mutateAsync({ licenseId: expiryDialog.licenseId, newExpiresAt: new Date(newExpiryDate).toISOString() }); } catch (e) {}
    setExpiryDialog(null); setNewExpiryDate('');
  };

  const copyKey = async (key: string) => {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(key);
        ok = true;
      }
    } catch {}
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = key;
        ta.style.position = 'fixed';
        ta.style.top = '0';
        ta.style.left = '0';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch {}
    }
    if (ok) {
      toast({ title: 'Copiado', description: 'Chave copiada para a área de transferência.' });
    } else {
      toast({ title: 'Copie manualmente', description: key });
    }
  };

  const isPending = revokeMutation.isPending || deleteMutation.isPending || resetDeviceMutation.isPending;

  return (
    <AdminLayout>
      <div className="space-y-8 px-1 sm:px-0 pt-14 lg:pt-0">
        {/* Banner */}
        <div className="w-full rounded-2xl overflow-hidden glow-card purple-glow animate-fade-up">
          <img
            src="https://ccqesqhkqbnnwmowrghj.supabase.co/storage/v1/object/public/public-assets/extension-banner.png?v=4"
            alt="Banner"
            className="w-full h-auto object-cover"
          />
        </div>

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up-delay-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2 font-display">Gestão</p>
            <h1 className="text-4xl sm:text-5xl font-black text-gradient-white font-display leading-[1.1]">Licenças</h1>
            <p className="text-sm text-muted-foreground mt-2">Gerencie suas licenças de software</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 w-full sm:w-[250px] bg-card/40 border-border/30 focus:border-primary/30"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived(v => !v)}
              className={`border-border/30 font-display shrink-0 text-xs ${showArchived ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' : ''}`}
            >
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              {showArchived ? 'Ocultar' : 'Arquivadas'}
            </Button>
            <Button variant="outline" onClick={() => setOnlineDialog(true)} className="border-border/30 hover:bg-success/10 hover:border-success/30 font-display shrink-0 relative">
              <Wifi className="h-4 w-4 mr-2 text-success" />
              <span className="hidden sm:inline">Online</span>
              {(onlineUsers?.length || 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-success text-success-foreground text-[10px] font-black rounded-full h-5 w-5 flex items-center justify-center">
                  {onlineUsers?.length}
                </span>
              )}
            </Button>
            <Button onClick={() => setCreateDialog(true)} className="bg-gradient shadow-lg shadow-primary/20 hover:shadow-primary/30 font-display shrink-0">
              <Plus className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Nova Licença</span><span className="sm:hidden">Nova</span>
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card rounded-2xl overflow-hidden animate-fade-up-delay-2">
          <ScrollArea>
            <Table>
              <TableHeader>
                <TableRow className="border-border/20 hover:bg-transparent">
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Email</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Chave</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display text-center">Status</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display text-center">Plano</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display text-center">Uso/dia</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display text-center">Devices</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Expira</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">Criador</TableHead>
                  <TableHead className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground font-display">Carregando...</TableCell></TableRow>
                ) : filteredLicenses.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-24 text-center text-muted-foreground font-display">Nenhuma licença encontrada.</TableCell></TableRow>
                ) : (
                  filteredLicenses.map((license) => (
                    <TableRow key={license.id} className={`border-border/10 hover:bg-primary/[0.03] transition-colors ${license.status === 'archived' ? 'opacity-50' : ''}`}>
                      <TableCell className="font-medium text-[13px] font-display">{license.email}</TableCell>
                      <TableCell>
                        <button onClick={() => copyKey(license.license_key)} className="font-mono text-xs hover:text-primary transition-colors cursor-pointer text-foreground/70">
                          {license.license_key.slice(0, 12)}...
                        </button>
                      </TableCell>
                      <TableCell className="text-center"><StatusBadge status={license.status} notes={license.notes} /></TableCell>
                      <TableCell className="text-center"><PlanBadge plan={license.plan} /></TableCell>
                      <TableCell className="text-center text-xs font-mono font-bold font-display text-foreground/80">
                        {license.is_wildcard ? '∞' : `${license.daily_used ?? 0}/${license.daily_limit ?? 50}`}
                      </TableCell>
                      <TableCell className="text-center text-sm font-bold font-display text-foreground/80">{license.devices.length}</TableCell>
                      <TableCell className="text-sm font-display text-foreground/70">
                        {license.duration_hours && !license.first_activated_at && !license.is_wildcard ? (
                          <span className="text-xs text-muted-foreground">⏳ {Math.round(license.duration_hours / 24)}d (aguardando)</span>
                        ) : (
                          format(parseISO(license.expires_at), 'dd/MM/yyyy', { locale: ptBR })
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-display text-foreground/70 whitespace-nowrap">
                        {license.creator_name || 'Admin'}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-border/30">
                            <DropdownMenuItem onClick={() => copyKey(license.license_key)}><Copy className="h-4 w-4 mr-2" /> Copiar Chave</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setRenewDialog({ licenseId: license.id, licenseKey: license.license_key })}><RefreshCw className="h-4 w-4 mr-2" /> Renovar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { setExpiryDialog({ licenseId: license.id, licenseKey: license.license_key, currentExpiry: license.expires_at }); setNewExpiryDate(license.expires_at.slice(0, 10)); }}><Calendar className="h-4 w-4 mr-2" /> Alterar Expiração</DropdownMenuItem>
                            {!license.is_wildcard && (
                              <DropdownMenuItem onClick={() => { setPlanDialog({ licenseId: license.id, licenseKey: license.license_key, currentPlan: license.plan }); setChangePlan(license.plan as any); }}><Key className="h-4 w-4 mr-2" /> Alterar Plano</DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator className="bg-border/20" />
                            <DropdownMenuItem onClick={() => setConfirmDialog({ type: 'reset', licenseId: license.id, licenseKey: license.license_key })}><RotateCcw className="h-4 w-4 mr-2" /> Resetar Dispositivo</DropdownMenuItem>
                            {license.status === 'active' && (
                              <DropdownMenuItem onClick={() => archiveMutation.mutate(license.id)} className="text-orange-400 focus:text-orange-400"><Archive className="h-4 w-4 mr-2" /> Arquivar</DropdownMenuItem>
                            )}
                            {license.status === 'archived' && (
                              <DropdownMenuItem onClick={() => reactivateMutation.mutate(license.id)} className="text-success focus:text-success"><ArchiveRestore className="h-4 w-4 mr-2" /> Reativar</DropdownMenuItem>
                            )}
                            {license.status === 'active' && (
                              <DropdownMenuItem onClick={() => setConfirmDialog({ type: 'revoke', licenseId: license.id, licenseKey: license.license_key })} className="text-destructive focus:text-destructive"><Ban className="h-4 w-4 mr-2" /> Revogar</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setConfirmDialog({ type: 'delete', licenseId: license.id, licenseKey: license.license_key })} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4 mr-2" /> Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        <p className="text-xs text-muted-foreground font-display">Total: <span className="font-bold text-foreground">{filteredLicenses.length}</span> licenças{showArchived ? ' (incluindo arquivadas)' : ''}</p>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30">
          <DialogHeader>
            <DialogTitle className="font-display">
              {confirmDialog?.type === 'revoke' && 'Revogar Licença'}
              {confirmDialog?.type === 'delete' && 'Excluir Licença'}
              {confirmDialog?.type === 'reset' && 'Resetar Dispositivo'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.type === 'revoke' && `Tem certeza que deseja revogar a licença ${confirmDialog?.licenseKey}?`}
              {confirmDialog?.type === 'delete' && `Tem certeza que deseja excluir permanentemente a licença ${confirmDialog?.licenseKey}?`}
              {confirmDialog?.type === 'reset' && `Tem certeza que deseja resetar o dispositivo da licença ${confirmDialog?.licenseKey}?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)} className="border-border/30">Cancelar</Button>
            <Button variant="destructive" onClick={handleConfirmAction} disabled={isPending}>{isPending ? 'Processando...' : 'Confirmar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30">
          <DialogHeader><DialogTitle className="font-display">Nova Licença</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="font-display text-xs uppercase tracking-wider">Email</Label><Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" className="bg-background/50 border-border/30" /></div>
            {!newIsWildcard && (
              <div>
                <Label className="font-display text-xs uppercase tracking-wider">Duração</Label>
                <div className="mt-2 rounded-xl border border-border/20 bg-background/20 px-4 py-3 text-sm font-display">
                  30 dias <span className="text-xs text-muted-foreground">(fixo — apenas chaves coringa têm duração diferente)</span>
                </div>
              </div>
            )}
            <div>
              <Label className="font-display text-xs uppercase tracking-wider">Plano</Label>
              <Select value={newPlan} onValueChange={(v) => setNewPlan(v as any)}>
                <SelectTrigger className="mt-2 bg-background/50 border-border/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basico">Básico — 50 envios/dia</SelectItem>
                  <SelectItem value="plus">Plus — 100 envios/dia</SelectItem>
                  <SelectItem value="pro">Pro — 200 envios/dia</SelectItem>
                  <SelectItem value="fundador">LOV3 Fundador — 120 envios/dia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label className="font-display text-xs uppercase tracking-wider">Preço (R$)</Label><Input type="number" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} placeholder="0" className="bg-background/50 border-border/30" /></div>
            <div><Label className="font-display text-xs uppercase tracking-wider">Notas</Label><Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Opcional" className="bg-background/50 border-border/30" /></div>
            <div className="flex items-center justify-between rounded-xl border border-border/20 bg-background/20 p-4">
              <div className="space-y-0.5">
                <Label className="text-sm font-bold flex items-center gap-2 font-display"><Infinity className="h-4 w-4 text-primary" /> Chave Coringa</Label>
                <p className="text-xs text-muted-foreground">Sem limite de dispositivo ou validade</p>
              </div>
              <Switch checked={newIsWildcard} onCheckedChange={setNewIsWildcard} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)} className="border-border/30">Cancelar</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending || !newEmail} className="bg-gradient shadow-lg shadow-primary/20 font-display">{createMutation.isPending ? 'Criando...' : 'Criar Licença'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={!!planDialog} onOpenChange={() => setPlanDialog(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30">
          <DialogHeader>
            <DialogTitle className="font-display">Alterar Plano</DialogTitle>
            <DialogDescription>Chave: {planDialog?.licenseKey}</DialogDescription>
          </DialogHeader>
          <div>
            <Label className="font-display text-xs uppercase tracking-wider">Novo Plano</Label>
            <Select value={changePlan} onValueChange={(v) => setChangePlan(v as any)}>
              <SelectTrigger className="mt-2 bg-background/50 border-border/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basico">Básico — 50 envios/dia (R$ 79,90/mês)</SelectItem>
                <SelectItem value="plus">Plus — 100 envios/dia (R$ 99,99/mês)</SelectItem>
                <SelectItem value="pro">Pro — 200 envios/dia (R$ 149,99/mês)</SelectItem>
                <SelectItem value="fundador">LOV3 Fundador — 120 envios/dia (R$ 79,90/mês)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog(null)} className="border-border/30">Cancelar</Button>
            <Button
              onClick={() => { if (planDialog) { setPlanMutation.mutate({ licenseId: planDialog.licenseId, plan: changePlan }); setPlanDialog(null); } }}
              disabled={setPlanMutation.isPending}
              className="bg-gradient font-display"
            >
              {setPlanMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={!!renewDialog} onOpenChange={() => setRenewDialog(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30">
          <DialogHeader>
            <DialogTitle className="font-display">Renovar Licença</DialogTitle>
            <DialogDescription>Escolha o período para {renewDialog?.licenseKey}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3">
            <Button variant="outline" onClick={() => handleRenew(30)} disabled={renewMutation.isPending} className="border-border/30 hover:bg-primary/10 hover:border-primary/20 font-display font-bold">Renovar +30 dias</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Expiry Dialog */}
      <Dialog open={!!expiryDialog} onOpenChange={() => setExpiryDialog(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30">
          <DialogHeader>
            <DialogTitle className="font-display">Alterar Expiração</DialogTitle>
            <DialogDescription>Nova data para {expiryDialog?.licenseKey}</DialogDescription>
          </DialogHeader>
          <div><Label className="font-display text-xs uppercase tracking-wider">Nova data</Label><Input type="date" value={newExpiryDate} onChange={(e) => setNewExpiryDate(e.target.value)} className="bg-background/50 border-border/30" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpiryDialog(null)} className="border-border/30">Cancelar</Button>
            <Button onClick={handleSetExpiry} disabled={setExpiryMutation.isPending || !newExpiryDate} className="bg-gradient font-display">{setExpiryMutation.isPending ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Online Users Dialog */}
      <Dialog open={onlineDialog} onOpenChange={setOnlineDialog}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30 max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Wifi className="h-5 w-5 text-success" />
              Usuários Online
              <Badge variant="secondary" className="ml-2 bg-success/15 text-success border-success/20 font-black">
                {onlineUsers?.length || 0}
              </Badge>
            </DialogTitle>
            <DialogDescription>Sessões ativas no momento (atualiza a cada 15s)</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {!onlineUsers || onlineUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 font-display">Nenhum usuário online no momento.</p>
            ) : (
              <div className="space-y-3">
                {onlineUsers.map((u) => (
                  <div key={u.session_id} className="flex items-center gap-3 rounded-xl border border-border/20 bg-background/30 p-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-success animate-pulse shrink-0" />
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-semibold text-foreground">{u.license_key}</span>
                        {u.creator_name && (
                          <Badge variant="outline" className="text-[10px] border-border/30 font-display">{u.creator_name}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-display">
                        <span>{u.customer_name || u.email}</span>
                        {u.device_name && <span>• {u.device_name}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-display whitespace-nowrap">
                      {formatDistanceToNow(parseISO(u.last_activity), { locale: ptBR, addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

function StatusBadge({ status, notes }: { status: string; notes?: string | null }) {
  const isRenewed = status === 'expired' && notes?.includes('[Renovada');
  const config = isRenewed
    ? { label: 'RENOVADA', className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' }
    : {
        active:   { label: 'ATIVA',      className: 'bg-success/15 text-success border-success/20' },
        expired:  { label: 'EXPIRADA',   className: 'bg-warning/15 text-warning border-warning/20' },
        revoked:  { label: 'REV',        className: 'bg-destructive/15 text-destructive border-destructive/20' },
        archived: { label: 'ARQUIVADA',  className: 'bg-orange-500/15 text-orange-400 border-orange-500/20' },
      }[status] || { label: status, className: 'bg-muted text-muted-foreground border-border' };

  return (
    <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-black font-display ${config.className}`}>
      {config.label}
    </span>
  );
}

function PlanBadge({ plan }: { plan?: string }) {
  const cfg: Record<string, { label: string; className: string }> = {
    basico:   { label: 'BÁSICO',   className: 'bg-muted/60 text-muted-foreground border-border/40' },
    plus:     { label: 'PLUS',     className: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
    pro:      { label: 'PRO',      className: 'bg-primary/15 text-primary border-primary/20' },
    fundador: { label: '★ FUNDADOR', className: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  };
  const { label, className } = cfg[plan ?? 'basico'] ?? cfg.basico;
  return (
    <span className={`rounded-lg border px-2 py-0.5 text-[9px] font-black font-display whitespace-nowrap ${className}`}>
      {label}
    </span>
  );
}
