import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Users, UserPlus, Shield, Coins, CreditCard, Ban, Trash2, Unlock, DollarSign, Key, Search, ShoppingCart, KeyRound } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAddCredits } from '@/hooks/useManagerData';
import { getErrorMessage } from '@/lib/utils';

interface ResellerProfile {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  phone: string | null;
  status: string;
  plan_type: string;
  approved_at: string | null;
  created_at: string;
  email?: string;
  custom_key_price?: number | null;
  licenseCount?: number;
  credits_total?: number;
  credits_used?: number;
  lifetime_credits_total?: number;
  lifetime_credits_used?: number;
  deadline_at?: string | null;
  paidKeys?: number;
}

function useResellers() {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['resellers', 'list'],
    queryFn: async () => {
      // 1 chamada RPC: já traz profiles + licenseCount + credits + paidKeys agregados
      const { data, error } = await supabase.rpc('admin_list_resellers' as any);
      if (error) throw error;
      const list = (Array.isArray(data) ? data : []) as ResellerProfile[];

      // Dispara busca de emails em paralelo (não bloqueia a renderização da lista).
      const userIds = list.map(r => r.user_id).filter(Boolean);
      if (userIds.length > 0) {
        supabase.functions
          .invoke('get-user-emails', { body: { userIds } })
          .then(({ data: emailData }) => {
            const emails = (emailData as any)?.emails as Record<string, string> | undefined;
            if (!emails) return;
            queryClient.setQueryData<ResellerProfile[]>(['resellers', 'list'], (prev) => {
              if (!prev) return prev;
              return prev.map(r => ({ ...r, email: emails[r.user_id] || r.email || '' }));
            });
          })
          .catch(() => {});
      }

      return list;
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  return listQuery;
}

function useManagers() {
  return useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*').eq('role', 'manager');
      if (error) throw error;
      return data || [];
    },
  });
}

function useApproveReseller() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ resellerId, action }: { resellerId: string; action: 'approve' | 'reject' }) => {
      const { data, error } = await supabase.functions.invoke('approve-reseller', { body: { resellerId, action } });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      toast({ title: action === 'approve' ? 'Revendedor aprovado' : 'Revendedor rejeitado' });
    },
    onError: () => { toast({ title: 'Erro', variant: 'destructive' }); },
  });
}

function useCreateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ email, password, role }: { email: string; password: string; role: 'reseller' | 'manager' }) => {
      if (role === 'reseller') {
        const { data, error } = await supabase.functions.invoke('create-reseller-user', { body: { email, password } });
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase.functions.invoke('create-manager-user', { body: { email, password } });
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, { role }) => {
      queryClient.invalidateQueries({ queryKey: ['resellers'] });
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      toast({ title: role === 'manager' ? 'Gerente criado' : 'Revendedor criado' });
    },
    onError: (error: Error) => { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); },
  });
}

function useUpdatePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ resellerId, planType }: { resellerId: string; planType: string }) => {
      const { error } = await supabase.from('reseller_profiles').update({ plan_type: planType }).eq('id', resellerId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['resellers'] }); toast({ title: 'Plano atualizado' }); },
    onError: () => { toast({ title: 'Erro', variant: 'destructive' }); },
  });
}

function useBlockReseller() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ resellerId, block }: { resellerId: string; block: boolean }) => {
      const { error, data, count } = await supabase.from('reseller_profiles').update({ status: block ? 'blocked' : 'approved' }).eq('id', resellerId).select();
      console.log('[BlockReseller] result:', { error, data, count, resellerId, block });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Nenhum registro atualizado - possível problema de permissão');
    },
    onSuccess: (_, { block }) => { queryClient.invalidateQueries({ queryKey: ['resellers'] }); toast({ title: block ? 'Bloqueado' : 'Desbloqueado' }); },
    onError: (err, { block }) => {
      console.error('[BlockReseller] error:', err);
      toast({
        title: block ? 'Erro ao bloquear' : 'Erro ao desbloquear',
        description: getErrorMessage(err, block ? 'Não foi possível bloquear o usuário.' : 'Não foi possível desbloquear o usuário.'),
        variant: 'destructive'
      });
    },
  });
}

function useDeleteReseller() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ resellerId, userId }: { resellerId: string; userId: string }) => {
      await supabase.from('reseller_credits').delete().eq('reseller_id', userId);
      const { error } = await supabase.from('reseller_profiles').delete().eq('id', resellerId);
      if (error) throw error;
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'reseller');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['resellers'] }); toast({ title: 'Revendedor excluído' }); },
    onError: () => { toast({ title: 'Erro', variant: 'destructive' }); },
  });
}

export default function Resellers() {
  const { data: resellers, isLoading } = useResellers();
  const { data: managers, isLoading: managersLoading } = useManagers();
  const approveReseller = useApproveReseller();
  const createUser = useCreateUser();
  const addCredits = useAddCredits();
  const updatePlan = useUpdatePlan();
  const blockReseller = useBlockReseller();
  const deleteReseller = useDeleteReseller();

  const [isCreateResellerOpen, setIsCreateResellerOpen] = useState(false);
  const [isCreateManagerOpen, setIsCreateManagerOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [creditDialog, setCreditDialog] = useState<{ resellerId: string; name: string } | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditLifetime, setCreditLifetime] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ resellerId: string; userId: string; name: string } | null>(null);
  const [priceDialog, setPriceDialog] = useState<{ resellerId: string; name: string; currentPrice: number | null } | null>(null);
  const [customPrice, setCustomPrice] = useState('');
  const [passwordDialog, setPasswordDialog] = useState<{ email: string; name: string } | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = resellers?.filter(r => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return r.name?.toLowerCase().includes(term) || r.email?.toLowerCase().includes(term);
  });

  const pending = filtered?.filter(r => r.status === 'pending') || [];
  const approved = filtered?.filter(r => r.status === 'approved') || [];
  const rejected = filtered?.filter(r => r.status === 'rejected') || [];
  const blocked = filtered?.filter(r => r.status === 'blocked') || [];

  const handleCreateReseller = async () => {
    if (!newEmail || !newPassword) return;
    await createUser.mutateAsync({ email: newEmail, password: newPassword, role: 'reseller' });
    setIsCreateResellerOpen(false); resetForm();
  };

  const handleCreateManager = async () => {
    if (!newEmail || !newPassword) return;
    await createUser.mutateAsync({ email: newEmail, password: newPassword, role: 'manager' });
    setIsCreateManagerOpen(false); resetForm();
  };

  const handleAddCredits = async () => {
    if (!creditDialog || !creditAmount) return;
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) return;
    await addCredits.mutateAsync({ resellerId: creditDialog.resellerId, amount, lifetime: creditLifetime });
    setCreditDialog(null); setCreditAmount(''); setCreditLifetime(false);
  };

  const resetForm = () => { setNewEmail(''); setNewPassword(''); setNewName(''); };

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleSaveCustomPrice = async () => {
    if (!priceDialog) return;
    const price = customPrice.trim() === '' ? null : parseFloat(customPrice);
    if (price !== null && (isNaN(price) || price <= 0)) {
      toast({ title: 'Valor inválido', variant: 'destructive' }); return;
    }
    const { error } = await supabase.from('reseller_profiles').update({ custom_key_price: price } as any).eq('id', priceDialog.resellerId);
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    queryClient.invalidateQueries({ queryKey: ['resellers'] });
    toast({ title: 'Preço atualizado' });
    setPriceDialog(null); setCustomPrice('');
  };

  const handleResetPassword = async () => {
    if (!passwordDialog || !newPasswordValue || newPasswordValue.length < 6) {
      toast({ title: 'Senha inválida', description: 'Mínimo 6 caracteres', variant: 'destructive' });
      return;
    }
    setResettingPassword(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: { email: passwordDialog.email, newPassword: newPasswordValue },
      });
      if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
      toast({ title: 'Senha alterada', description: passwordDialog.email });
      setPasswordDialog(null); setNewPasswordValue('');
    } catch (err) {
      toast({ title: 'Erro', description: getErrorMessage(err, 'Não foi possível alterar a senha'), variant: 'destructive' });
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8 px-1 sm:px-0 pt-14 lg:pt-0">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between animate-fade-up">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2 font-display">Gestão</p>
            <h1 className="text-4xl sm:text-5xl font-black text-gradient-white font-display leading-[1.1]">Revendedores</h1>
            <p className="text-sm text-muted-foreground mt-2">Gerencie revendedores, gerentes e créditos</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9 bg-card/40 border-border/30 focus:border-primary/30" />
            </div>
            <Dialog open={isCreateResellerOpen} onOpenChange={(open) => { setIsCreateResellerOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="border-border/30 hover:bg-primary/10 hover:border-primary/20 font-display"><UserPlus className="mr-2 h-3.5 w-3.5" />Revendedor</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border-border/30">
                <DialogHeader><DialogTitle className="font-display">Criar Revendedor</DialogTitle><DialogDescription>Conta com aprovação automática</DialogDescription></DialogHeader>
                <div className="space-y-4 py-2">
                  <div><Label className="font-display text-xs uppercase tracking-wider">Email</Label><Input type="email" placeholder="revendedor@exemplo.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-background/50 border-border/30" /></div>
                  <div><Label className="font-display text-xs uppercase tracking-wider">Senha</Label><Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-background/50 border-border/30" /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsCreateResellerOpen(false); resetForm(); }} className="border-border/30">Cancelar</Button>
                  <Button onClick={handleCreateReseller} disabled={createUser.isPending || !newEmail || !newPassword} className="bg-gradient font-display">{createUser.isPending ? 'Criando...' : 'Criar'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isCreateManagerOpen} onOpenChange={(open) => { setIsCreateManagerOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient shadow-lg shadow-primary/20 font-display"><Shield className="mr-2 h-3.5 w-3.5" />Gerente</Button>
              </DialogTrigger>
              <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border-border/30">
                <DialogHeader><DialogTitle className="font-display">Criar Gerente</DialogTitle><DialogDescription>Conta para administrar créditos</DialogDescription></DialogHeader>
                <div className="space-y-4 py-2">
                  <div><Label className="font-display text-xs uppercase tracking-wider">Email</Label><Input type="email" placeholder="gerente@exemplo.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="bg-background/50 border-border/30" /></div>
                  <div><Label className="font-display text-xs uppercase tracking-wider">Senha</Label><Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="bg-background/50 border-border/30" /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsCreateManagerOpen(false); resetForm(); }} className="border-border/30">Cancelar</Button>
                  <Button onClick={handleCreateManager} disabled={createUser.isPending || !newEmail || !newPassword} className="bg-gradient font-display">{createUser.isPending ? 'Criando...' : 'Criar'}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 animate-fade-up-delay-1">
          <StatMini label="Pendentes" value={pending.length} icon={Clock} color="text-warning" />
          <StatMini label="Aprovados" value={approved.length} icon={CheckCircle} color="text-success" />
          <StatMini label="Bloqueados" value={blocked.length + rejected.length} icon={XCircle} color="text-destructive" />
          <StatMini label="Gerentes" value={managersLoading ? '—' : managers?.length || 0} icon={Shield} color="text-primary" />
        </div>

        {/* Sections */}
        <div className="space-y-6 animate-fade-up-delay-2">
          {pending.length > 0 && (
            <Section title="Aguardando Aprovação" count={pending.length}>
              {pending.map((reseller) => (
                <ResellerCard key={reseller.id} reseller={reseller} onApprove={() => approveReseller.mutate({ resellerId: reseller.id, action: 'approve' })} onReject={() => approveReseller.mutate({ resellerId: reseller.id, action: 'reject' })} isPending={approveReseller.isPending} onAddCredits={() => setCreditDialog({ resellerId: reseller.user_id, name: reseller.name })} onPlanChange={(plan) => updatePlan.mutate({ resellerId: reseller.id, planType: plan })} />
              ))}
            </Section>
          )}

          {approved.length > 0 && (
            <Section title="Aprovados" count={approved.length}>
              {approved.map((reseller) => (
                <ResellerCard key={reseller.id} reseller={reseller} onAddCredits={() => setCreditDialog({ resellerId: reseller.user_id, name: reseller.name })} onPlanChange={(plan) => updatePlan.mutate({ resellerId: reseller.id, planType: plan })} onBlock={() => blockReseller.mutate({ resellerId: reseller.id, block: true })} onDelete={() => setDeleteConfirm({ resellerId: reseller.id, userId: reseller.user_id, name: reseller.name })} onSetPrice={() => { setPriceDialog({ resellerId: reseller.id, name: reseller.name, currentPrice: reseller.custom_key_price ?? null }); setCustomPrice(reseller.custom_key_price ? String(reseller.custom_key_price) : ''); }} onResetPassword={reseller.email ? () => setPasswordDialog({ email: reseller.email!, name: reseller.name }) : undefined} />
              ))}
            </Section>
          )}

          {blocked.length > 0 && (
            <Section title="Bloqueados" count={blocked.length} titleColor="text-destructive">
              {blocked.map((reseller) => (
                <ResellerCard key={reseller.id} reseller={reseller} onUnblock={() => blockReseller.mutate({ resellerId: reseller.id, block: false })} onDelete={() => setDeleteConfirm({ resellerId: reseller.id, userId: reseller.user_id, name: reseller.name })} onPlanChange={(plan) => updatePlan.mutate({ resellerId: reseller.id, planType: plan })} />
              ))}
            </Section>
          )}

          {rejected.length > 0 && (
            <Section title="Rejeitados" count={rejected.length}>
              {rejected.map((reseller) => (
                <ResellerCard key={reseller.id} reseller={reseller} onApprove={() => approveReseller.mutate({ resellerId: reseller.id, action: 'approve' })} isPending={approveReseller.isPending} onPlanChange={(plan) => updatePlan.mutate({ resellerId: reseller.id, planType: plan })} onDelete={() => setDeleteConfirm({ resellerId: reseller.id, userId: reseller.user_id, name: reseller.name })} />
              ))}
            </Section>
          )}
        </div>

        {isLoading && <p className="text-sm text-muted-foreground text-center py-12 font-display">Carregando...</p>}
        {!isLoading && resellers?.length === 0 && <p className="text-sm text-muted-foreground text-center py-12 font-display">Nenhum revendedor cadastrado</p>}

        {/* Credit Dialog */}
        <Dialog open={!!creditDialog} onOpenChange={(open) => { if (!open) { setCreditDialog(null); setCreditAmount(''); setCreditLifetime(false); } }}>
          <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border-border/30">
            <DialogHeader><DialogTitle className="font-display">Adicionar Créditos</DialogTitle><DialogDescription>{creditDialog?.name}</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label className="font-display text-xs uppercase tracking-wider">Quantidade</Label><Input type="number" placeholder="Ex: 50" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} className="bg-background/50 border-border/30" /></div>
              <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map(v => (
                  <Button key={v} variant={creditAmount === String(v) ? 'default' : 'outline'} size="sm" onClick={() => setCreditAmount(String(v))} className={creditAmount !== String(v) ? 'border-border/30 hover:bg-primary/10 font-display' : 'bg-gradient font-display'}>{v}</Button>
                ))}
              </div>
              <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${creditLifetime ? 'border-amber-500/40 bg-amber-500/[0.06]' : 'border-border/30 hover:border-amber-500/30'}`}>
                <input type="checkbox" checked={creditLifetime} onChange={(e) => setCreditLifetime(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-amber-500" />
                <div className="flex-1">
                  <p className="text-sm font-display font-bold text-foreground">⚡ Créditos Vitalícios</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Quando marcado, esses créditos permitem ao revendedor gerar <strong>chaves vitalícias</strong> em vez de chaves de 30 dias.</p>
                </div>
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreditDialog(null); setCreditAmount(''); setCreditLifetime(false); }} className="border-border/30">Cancelar</Button>
              <Button onClick={handleAddCredits} disabled={!creditAmount || addCredits.isPending} className="bg-gradient font-display">Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
          <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/30">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Excluir revendedor</AlertDialogTitle>
              <AlertDialogDescription>Tem certeza que deseja excluir <strong>{deleteConfirm?.name}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-border/30">Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-display" onClick={() => { if (deleteConfirm) { deleteReseller.mutate({ resellerId: deleteConfirm.resellerId, userId: deleteConfirm.userId }); setDeleteConfirm(null); } }}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Custom Price Dialog */}
        <Dialog open={!!priceDialog} onOpenChange={(open) => { if (!open) { setPriceDialog(null); setCustomPrice(''); } }}>
          <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border-border/30">
            <DialogHeader><DialogTitle className="font-display">Preço por Key</DialogTitle><DialogDescription>{priceDialog?.name}</DialogDescription></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="font-display text-xs uppercase tracking-wider">Preço por chave (R$)</Label>
                <Input type="number" step="0.01" min="0" placeholder="Vazio = preço do plano" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} className="bg-background/50 border-border/30" />
                <p className="text-xs text-muted-foreground mt-1">{priceDialog?.currentPrice ? `Atual: R$ ${priceDialog.currentPrice.toFixed(2)}/key` : 'Usando preço padrão do plano'}</p>
              </div>
            </div>
            <DialogFooter>
              {priceDialog?.currentPrice != null && <Button variant="outline" onClick={() => { setCustomPrice(''); handleSaveCustomPrice(); }} className="border-border/30 font-display">Usar Padrão</Button>}
              <Button onClick={handleSaveCustomPrice} className="bg-gradient font-display">Salvar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={!!passwordDialog} onOpenChange={(open) => { if (!open) { setPasswordDialog(null); setNewPasswordValue(''); } }}>
          <DialogContent className="max-w-sm bg-card/95 backdrop-blur-xl border-border/30">
            <DialogHeader>
              <DialogTitle className="font-display">Alterar Senha</DialogTitle>
              <DialogDescription>{passwordDialog?.name} • {passwordDialog?.email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label className="font-display text-xs uppercase tracking-wider">Nova senha</Label>
                <Input type="text" placeholder="Mínimo 6 caracteres" value={newPasswordValue} onChange={(e) => setNewPasswordValue(e.target.value)} className="bg-background/50 border-border/30" autoFocus />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setPasswordDialog(null); setNewPasswordValue(''); }} className="border-border/30">Cancelar</Button>
              <Button onClick={handleResetPassword} disabled={resettingPassword || newPasswordValue.length < 6} className="bg-gradient font-display">{resettingPassword ? 'Salvando...' : 'Alterar'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

/* ─── Sub-components ─── */

function Section({ title, count, children, titleColor }: { title: string; count: number; children: React.ReactNode; titleColor?: string }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <h2 className={`text-xs font-bold uppercase tracking-[0.15em] font-display ${titleColor || 'text-muted-foreground'}`}>{title}</h2>
        <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg font-display">{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function StatMini({ label, value, icon: Icon, color }: { label: string; value: any; icon: any; color: string }) {
  return (
    <div className="glass-card-hover rounded-2xl p-5 relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground font-display">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`text-3xl font-black tabular-nums font-display ${color}`}>{value}</p>
    </div>
  );
}

function ResellerCard({ reseller, onApprove, onReject, isPending, onAddCredits, onPlanChange, onBlock, onUnblock, onDelete, onSetPrice, onResetPassword }: { reseller: ResellerProfile; onApprove?: () => void; onReject?: () => void; isPending?: boolean; onAddCredits?: () => void; onPlanChange?: (plan: string) => void; onBlock?: () => void; onUnblock?: () => void; onDelete?: () => void; onSetPrice?: () => void; onResetPassword?: () => void }) {
  const statusConfig = {
    pending: { label: 'PENDENTE', className: 'bg-warning/15 text-warning border-warning/20' },
    approved: { label: 'APROVADO', className: 'bg-success/15 text-success border-success/20' },
    rejected: { label: 'REJEITADO', className: 'bg-destructive/15 text-destructive border-destructive/20' },
    blocked: { label: 'BLOQUEADO', className: 'bg-destructive/15 text-destructive border-destructive/20' },
  }[reseller.status] || { label: reseller.status, className: 'bg-muted text-muted-foreground border-border' };

  const planLabel = { '197': 'R$ 197', '297': 'R$ 297', '997': 'R$ 997' }[reseller.plan_type] || 'R$ 197';
  const available = (reseller.credits_total ?? 0) - (reseller.credits_used ?? 0);
  const lifetimeAvailable = (reseller.lifetime_credits_total ?? 0) - (reseller.lifetime_credits_used ?? 0);

  return (
    <div className="glass-card rounded-2xl p-5 hover:border-primary/15 transition-all duration-300">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[15px] font-bold font-display">{reseller.name}</p>
            <span className={`rounded-lg border px-2 py-0.5 text-[10px] font-black font-display ${statusConfig.className}`}>{statusConfig.label}</span>
            <span className="rounded-lg border border-border/20 bg-background/20 px-2 py-0.5 text-[10px] font-bold font-display text-muted-foreground">
              <CreditCard className="inline mr-1 h-3 w-3" />{planLabel}
            </span>
            {reseller.custom_key_price != null && (
              <span className="rounded-lg border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold font-display text-primary">
                <DollarSign className="inline mr-0.5 h-3 w-3" />R$ {Number(reseller.custom_key_price).toFixed(2)}/key
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs font-display">
            <span className="flex items-center gap-1.5 rounded-lg border border-border/20 bg-background/20 px-2.5 py-1">
              <Key className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-bold text-foreground">{reseller.licenseCount ?? 0}</span><span className="text-muted-foreground">geradas</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-success/20 bg-success/10 px-2.5 py-1">
              <ShoppingCart className="h-3.5 w-3.5 text-success" /><span className="font-bold text-success">{reseller.paidKeys ?? 0}</span><span className="text-success/80">pagas PIX</span>
            </span>
            <span className="flex items-center gap-1.5 rounded-lg border border-border/20 bg-background/20 px-2.5 py-1">
              <Coins className="h-3.5 w-3.5 text-muted-foreground" /><span className="font-bold text-foreground">{available}</span><span className="text-muted-foreground">/ {reseller.credits_total ?? 0} créditos</span>
            </span>
            {(reseller.lifetime_credits_total ?? 0) > 0 && (
              <span className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1">
                <Coins className="h-3.5 w-3.5 text-amber-500" /><span className="font-bold text-amber-500">{lifetimeAvailable}</span><span className="text-amber-500/80">/ {reseller.lifetime_credits_total ?? 0} vitalícios</span>
              </span>
            )}
            {reseller.deadline_at && (
              <span className="flex items-center gap-1.5 rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-1">
                <Clock className="h-3.5 w-3.5 text-destructive" /><span className="font-bold text-destructive">{format(parseISO(reseller.deadline_at), "dd/MM HH:mm", { locale: ptBR })}</span>
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {reseller.email && <p className="text-[11px] text-muted-foreground">{reseller.email}</p>}
            {reseller.company && <p className="text-[11px] text-muted-foreground">• {reseller.company}</p>}
            {reseller.phone && <p className="text-[11px] text-muted-foreground">• {reseller.phone}</p>}
          </div>
          <p className="text-[10px] text-muted-foreground/60 font-display">
            {format(parseISO(reseller.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end shrink-0">
          {onPlanChange && (
            <Select value={reseller.plan_type || '197'} onValueChange={onPlanChange}>
              <SelectTrigger className="h-8 w-[120px] text-xs border-border/30 bg-background/30 font-display"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                <SelectItem value="197">R$ 197</SelectItem>
                <SelectItem value="297">R$ 297</SelectItem>
                <SelectItem value="997">R$ 997</SelectItem>
              </SelectContent>
            </Select>
          )}
          {onSetPrice && reseller.status === 'approved' && (
            <Button size="sm" variant="outline" onClick={onSetPrice} className="border-border/30 hover:bg-primary/10 font-display text-xs"><DollarSign className="mr-1 h-3.5 w-3.5" />Preço</Button>
          )}
          {onAddCredits && reseller.status === 'approved' && (
            <Button size="sm" variant="outline" onClick={onAddCredits} className="border-border/30 hover:bg-primary/10 font-display text-xs"><Coins className="mr-1 h-3.5 w-3.5" />Créditos</Button>
          )}
          {onResetPassword && (
            <Button size="sm" variant="outline" onClick={onResetPassword} className="border-border/30 hover:bg-primary/10 font-display text-xs"><KeyRound className="mr-1 h-3.5 w-3.5" />Senha</Button>
          )}
          {onApprove && <Button size="sm" onClick={onApprove} disabled={isPending} className="bg-gradient shadow-lg shadow-primary/20 font-display text-xs"><CheckCircle className="mr-1 h-3.5 w-3.5" />Aprovar</Button>}
          {onReject && <Button size="sm" variant="destructive" onClick={onReject} disabled={isPending} className="font-display text-xs"><XCircle className="mr-1 h-3.5 w-3.5" />Rejeitar</Button>}
          {onBlock && <Button size="sm" variant="outline" onClick={onBlock} className="text-destructive border-destructive/20 hover:bg-destructive/10 font-display text-xs"><Ban className="mr-1 h-3.5 w-3.5" />Bloquear</Button>}
          {onUnblock && <Button size="sm" variant="outline" onClick={onUnblock} className="text-success border-success/20 hover:bg-success/10 font-display text-xs"><Unlock className="mr-1 h-3.5 w-3.5" />Desbloquear</Button>}
          {onDelete && <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive hover:bg-destructive/10"><Trash2 className="h-3.5 w-3.5" /></Button>}
        </div>
      </div>
    </div>
  );
}
