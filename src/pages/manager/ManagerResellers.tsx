import { useState } from 'react';
import { ManagerLayout } from '@/components/manager/ManagerLayout';
import { useManagerResellers, useAddCredits, useSetCredits } from '@/hooks/useManagerData';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, Search, Coins, Plus, UserPlus, CreditCard, Ban, Trash2, Unlock, DollarSign } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
  custom_key_price: number | null;
}

function useAllResellers() {
  return useQuery({
    queryKey: ['manager-all-resellers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reseller_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const resellers = (data || []) as ResellerProfile[];

      const userIds = resellers.map(r => r.user_id);
      if (userIds.length > 0) {
        try {
          const { data: emailData } = await supabase.functions.invoke('get-user-emails', {
            body: { userIds },
          });
          if (emailData?.emails) {
            for (const r of resellers) {
              r.email = emailData.emails[r.user_id] || '';
            }
          }
        } catch {}
      }

      return resellers;
    },
  });
}

function useApproveReseller() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ resellerId, action }: { resellerId: string; action: 'approve' | 'reject' }) => {
      const { data, error } = await supabase.functions.invoke('approve-reseller', {
        body: { resellerId, action },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ['manager-all-resellers'] });
      queryClient.invalidateQueries({ queryKey: ['manager-resellers'] });
      queryClient.invalidateQueries({ queryKey: ['manager-stats'] });
      toast({
        title: action === 'approve' ? 'Revendedor aprovado' : 'Revendedor rejeitado',
        description: action === 'approve' ? 'O revendedor agora tem acesso ao painel.' : 'A solicitação foi rejeitada.',
      });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível processar a ação.', variant: 'destructive' });
    },
  });
}
function useUpdatePlan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ resellerId, planType }: { resellerId: string; planType: string }) => {
      const { error } = await supabase
        .from('reseller_profiles')
        .update({ plan_type: planType })
        .eq('id', resellerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-all-resellers'] });
      queryClient.invalidateQueries({ queryKey: ['manager-resellers'] });
      toast({ title: 'Plano atualizado', description: 'O plano do revendedor foi alterado.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível alterar o plano.', variant: 'destructive' });
    },
  });
}

function useBlockReseller() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ resellerId, block }: { resellerId: string; block: boolean }) => {
      const { error, data } = await supabase
        .from('reseller_profiles')
        .update({ status: block ? 'blocked' : 'approved' })
        .eq('id', resellerId)
        .select();
      console.log('[BlockReseller-Manager] result:', { error, data, resellerId, block });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error('Nenhum registro atualizado - possível problema de permissão');
    },
    onSuccess: (_, { block }) => {
      queryClient.invalidateQueries({ queryKey: ['manager-all-resellers'] });
      queryClient.invalidateQueries({ queryKey: ['manager-resellers'] });
      queryClient.invalidateQueries({ queryKey: ['manager-stats'] });
      toast({ title: block ? 'Revendedor bloqueado' : 'Revendedor desbloqueado', description: block ? 'O acesso do revendedor foi bloqueado.' : 'O revendedor foi desbloqueado.' });
    },
    onError: (err, { block }) => {
      console.error('[BlockReseller-Manager] error:', err);
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
      // Delete credits
      await supabase.from('reseller_credits').delete().eq('reseller_id', userId);
      // Delete profile
      const { error } = await supabase.from('reseller_profiles').delete().eq('id', resellerId);
      if (error) throw error;
      // Delete role
      await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', 'reseller');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-all-resellers'] });
      queryClient.invalidateQueries({ queryKey: ['manager-resellers'] });
      queryClient.invalidateQueries({ queryKey: ['manager-stats'] });
      toast({ title: 'Revendedor excluído', description: 'O revendedor foi removido do sistema.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível excluir o revendedor.', variant: 'destructive' });
    },
  });
}

export default function ManagerResellers() {
  const { data: allResellers, isLoading: allLoading } = useAllResellers();
  const { data: resellersWithCredits } = useManagerResellers();
  const approveReseller = useApproveReseller();
  const addCredits = useAddCredits();
  const setCredits = useSetCredits();
  const updatePlan = useUpdatePlan();
  const blockReseller = useBlockReseller();
  const deleteReseller = useDeleteReseller();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [creditDialog, setCreditDialog] = useState<{ resellerId: string; name: string; currentTotal: number; currentUsed: number } | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditMode, setCreditMode] = useState<'add' | 'set'>('add');
  const [creditLifetime, setCreditLifetime] = useState(false);
  const [newResellerDialog, setNewResellerDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ resellerId: string; userId: string; name: string } | null>(null);
  const [priceDialog, setPriceDialog] = useState<{ resellerId: string; name: string; currentPrice: number | null } | null>(null);
  const [customPrice, setCustomPrice] = useState('');
  const [savingPrice, setSavingPrice] = useState(false);

  const handleSaveCustomPrice = async () => {
    if (!priceDialog) return;
    setSavingPrice(true);
    try {
      const value = customPrice.trim() === '' ? null : parseFloat(customPrice.replace(',', '.'));
      if (value !== null && (isNaN(value) || value <= 0)) {
        toast({ title: 'Valor inválido', description: 'Digite um valor numérico positivo.', variant: 'destructive' });
        setSavingPrice(false);
        return;
      }
      const { error } = await supabase
        .from('reseller_profiles')
        .update({ custom_key_price: value })
        .eq('id', priceDialog.resellerId);
      if (error) throw error;
      toast({ title: 'Preço atualizado', description: value ? `Preço personalizado definido: R$ ${value.toFixed(2)}` : 'Usando preço padrão do plano.' });
      queryClient.invalidateQueries({ queryKey: ['manager-all-resellers'] });
      setPriceDialog(null);
      setCustomPrice('');
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível salvar o preço.', variant: 'destructive' });
    } finally {
      setSavingPrice(false);
    }
  };

  const creditMap = new Map(resellersWithCredits?.map(r => [r.user_id, r]) || []);

  const filterBySearch = (r: ResellerProfile) => r.name.toLowerCase().includes(search.toLowerCase());
  const pending = allResellers?.filter(r => r.status === 'pending' && filterBySearch(r)) || [];
  const approved = allResellers?.filter(r => r.status === 'approved' && filterBySearch(r)) || [];
  const rejected = allResellers?.filter(r => r.status === 'rejected' && filterBySearch(r)) || [];
  const blocked = allResellers?.filter(r => r.status === 'blocked' && filterBySearch(r)) || [];

  const handleCreditSubmit = async () => {
    if (!creditDialog || !creditAmount) return;
    const amount = parseInt(creditAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (creditMode === 'add') {
      await addCredits.mutateAsync({ resellerId: creditDialog.resellerId, amount, lifetime: creditLifetime });
    } else {
      await setCredits.mutateAsync({ resellerId: creditDialog.resellerId, total: amount });
    }
    setCreditDialog(null);
    setCreditAmount('');
    setCreditLifetime(false);
  };

  const handleCreateReseller = async () => {
    if (!newEmail || !newPassword) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-reseller-user', {
        body: { email: newEmail, password: newPassword, name: newName || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast({ title: 'Revendedor criado', description: `${newEmail} foi adicionado com sucesso.` });
      queryClient.invalidateQueries({ queryKey: ['manager-all-resellers'] });
      queryClient.invalidateQueries({ queryKey: ['manager-resellers'] });
      queryClient.invalidateQueries({ queryKey: ['manager-stats'] });
      setNewResellerDialog(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Não foi possível criar o revendedor.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <ManagerLayout>
      <div className="space-y-6 px-1 sm:px-0 pt-12 lg:pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-medium text-foreground">Revendedores</h1>
          <Button size="sm" onClick={() => setNewResellerDialog(true)}>
            <UserPlus className="mr-1 h-3.5 w-3.5" />Novo Revendedor
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Aprove, rejeite e gerencie créditos dos revendedores</p>

        <div className="grid gap-3 grid-cols-3">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Pendentes</span>
                <Clock className="h-3.5 w-3.5 text-warning" />
              </div>
              <p className="text-xl font-semibold tabular-nums text-warning">{pending.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Aprovados</span>
                <CheckCircle className="h-3.5 w-3.5 text-success" />
              </div>
              <p className="text-xl font-semibold tabular-nums text-success">{approved.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Rejeitados</span>
                <XCircle className="h-3.5 w-3.5 text-destructive" />
              </div>
              <p className="text-xl font-semibold tabular-nums text-destructive">{rejected.length}</p>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar revendedor..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Pending */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-warning">Aguardando Aprovação</h2>
            {pending.map((reseller) => (
              <ResellerCard
                key={reseller.id}
                reseller={reseller}
                credits={creditMap.get(reseller.user_id)}
                onApprove={() => approveReseller.mutate({ resellerId: reseller.id, action: 'approve' })}
                onReject={() => approveReseller.mutate({ resellerId: reseller.id, action: 'reject' })}
                isPending={approveReseller.isPending}
                onPlanChange={(plan) => updatePlan.mutate({ resellerId: reseller.id, planType: plan })}
              />
            ))}
          </div>
        )}

        {/* Approved */}
        {approved.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Aprovados</h2>
            {approved.map((reseller) => {
              const c = creditMap.get(reseller.user_id);
              return (
                 <ResellerCard
                  key={reseller.id}
                  reseller={reseller}
                  credits={c}
                  onAddCredits={() => setCreditDialog({
                    resellerId: reseller.user_id,
                    name: reseller.name,
                    currentTotal: c?.credits_total || 0,
                    currentUsed: c?.credits_used || 0,
                  })}
                  onPlanChange={(plan) => updatePlan.mutate({ resellerId: reseller.id, planType: plan })}
                  onBlock={() => blockReseller.mutate({ resellerId: reseller.id, block: true })}
                  onDelete={() => setDeleteConfirm({ resellerId: reseller.id, userId: reseller.user_id, name: reseller.name })}
                  onSetPrice={() => {
                    setPriceDialog({ resellerId: reseller.id, name: reseller.name, currentPrice: reseller.custom_key_price });
                    setCustomPrice(reseller.custom_key_price ? String(reseller.custom_key_price) : '');
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Blocked */}
        {blocked.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-destructive">Bloqueados</h2>
            {blocked.map((reseller) => (
              <ResellerCard
                key={reseller.id}
                reseller={reseller}
                onUnblock={() => blockReseller.mutate({ resellerId: reseller.id, block: false })}
                onDelete={() => setDeleteConfirm({ resellerId: reseller.id, userId: reseller.user_id, name: reseller.name })}
                onPlanChange={(plan) => updatePlan.mutate({ resellerId: reseller.id, planType: plan })}
              />
            ))}
          </div>
        )}

        {/* Rejected */}
        {rejected.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground">Rejeitados</h2>
            {rejected.map((reseller) => (
              <ResellerCard
                key={reseller.id}
                reseller={reseller}
                onApprove={() => approveReseller.mutate({ resellerId: reseller.id, action: 'approve' })}
                isPending={approveReseller.isPending}
                onPlanChange={(plan) => updatePlan.mutate({ resellerId: reseller.id, planType: plan })}
                onDelete={() => setDeleteConfirm({ resellerId: reseller.id, userId: reseller.user_id, name: reseller.name })}
              />
            ))}
          </div>
        )}

        {allLoading && <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>}
        {!allLoading && allResellers?.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum revendedor cadastrado</p>}

        {/* Credit Dialog */}
        <Dialog open={!!creditDialog} onOpenChange={(open) => { if (!open) { setCreditDialog(null); setCreditAmount(''); setCreditLifetime(false); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Gerenciar Créditos</DialogTitle>
              <DialogDescription>{creditDialog?.name} — {(creditDialog?.currentTotal || 0) - (creditDialog?.currentUsed || 0)} créditos disponíveis</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-2">
                <Button variant={creditMode === 'add' ? 'default' : 'outline'} size="sm" onClick={() => setCreditMode('add')}>Adicionar</Button>
                <Button variant={creditMode === 'set' ? 'default' : 'outline'} size="sm" onClick={() => setCreditMode('set')}>Definir Total</Button>
              </div>
              <div className="space-y-2">
                <Label>{creditMode === 'add' ? 'Quantidade a adicionar' : 'Novo total de créditos'}</Label>
                <Input type="number" placeholder={creditMode === 'add' ? 'Ex: 50' : 'Ex: 100'} value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} />
              </div>
              {creditMode === 'add' && (
                <div className="grid grid-cols-4 gap-2">
                  {[10, 25, 50, 100].map(v => (
                    <Button key={v} variant={creditAmount === String(v) ? 'default' : 'outline'} size="sm" onClick={() => setCreditAmount(String(v))}>{v}</Button>
                  ))}
                </div>
              )}
              {creditMode === 'add' && (
                <label className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors ${creditLifetime ? 'border-amber-500/50 bg-amber-500/[0.06]' : 'border-border hover:border-amber-500/30'}`}>
                  <input type="checkbox" checked={creditLifetime} onChange={(e) => setCreditLifetime(e.target.checked)} className="mt-0.5 h-4 w-4 rounded accent-amber-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">⚡ Créditos Vitalícios</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Permite ao revendedor gerar <strong>chaves vitalícias</strong> ao invés de chaves de 30 dias.</p>
                  </div>
                </label>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreditDialog(null); setCreditAmount(''); setCreditLifetime(false); }}>Cancelar</Button>
              <Button onClick={handleCreditSubmit} disabled={!creditAmount || addCredits.isPending || setCredits.isPending}>
                {creditMode === 'add' ? 'Adicionar' : 'Definir'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* New Reseller Dialog */}
        <Dialog open={newResellerDialog} onOpenChange={(open) => { if (!open) { setNewResellerDialog(false); setNewEmail(''); setNewPassword(''); setNewName(''); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Novo Revendedor</DialogTitle>
              <DialogDescription>Crie uma conta de revendedor já aprovada.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input placeholder="Nome do revendedor" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" placeholder="email@exemplo.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Senha *</Label>
                <Input type="password" placeholder="Senha" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setNewResellerDialog(false); setNewEmail(''); setNewPassword(''); setNewName(''); }}>Cancelar</Button>
              <Button onClick={handleCreateReseller} disabled={creating || !newEmail || !newPassword}>
                {creating ? 'Criando...' : 'Criar Revendedor'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir revendedor</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir <strong>{deleteConfirm?.name}</strong>? Esta ação removerá o perfil, créditos e permissões do revendedor. Não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteConfirm) {
                    deleteReseller.mutate({ resellerId: deleteConfirm.resellerId, userId: deleteConfirm.userId });
                    setDeleteConfirm(null);
                  }
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Price Dialog */}
        <Dialog open={!!priceDialog} onOpenChange={(open) => { if (!open) { setPriceDialog(null); setCustomPrice(''); } }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Preço por Key</DialogTitle>
              <DialogDescription>
                Defina um preço fixo por chave para <strong>{priceDialog?.name}</strong>. Deixe vazio para usar o preço padrão do plano.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label>Preço por Key (R$)</Label>
                <Input
                  type="text"
                  placeholder="Ex: 25.00 (vazio = padrão do plano)"
                  value={customPrice}
                  onChange={(e) => setCustomPrice(e.target.value)}
                />
              </div>
              {priceDialog?.currentPrice && (
                <p className="text-xs text-muted-foreground">
                  Preço atual: R$ {Number(priceDialog.currentPrice).toFixed(2)}/key
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setPriceDialog(null); setCustomPrice(''); }}>Cancelar</Button>
              <Button onClick={handleSaveCustomPrice} disabled={savingPrice}>
                {savingPrice ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ManagerLayout>
  );
}

function ResellerCard({ reseller, credits, onApprove, onReject, isPending, onAddCredits, onPlanChange, onBlock, onUnblock, onDelete, onSetPrice }: {
  reseller: ResellerProfile;
  credits?: { credits_total: number; credits_used: number; license_count: number };
  onApprove?: () => void;
  onReject?: () => void;
  isPending?: boolean;
  onAddCredits?: () => void;
  onPlanChange?: (plan: string) => void;
  onBlock?: () => void;
  onUnblock?: () => void;
  onDelete?: () => void;
  onSetPrice?: () => void;
}) {
  const statusConfig = {
    pending: { label: 'Pendente', variant: 'outline' as const },
    approved: { label: 'Aprovado', variant: 'default' as const },
    rejected: { label: 'Rejeitado', variant: 'destructive' as const },
    blocked: { label: 'Bloqueado', variant: 'destructive' as const },
  }[reseller.status] || { label: reseller.status, variant: 'outline' as const };

  const available = (credits?.credits_total || 0) - (credits?.credits_used || 0);
  const planLabel = { '197': 'R$ 197', '297': 'R$ 297', '997': 'R$ 997 (Ilimitado)' }[reseller.plan_type] || 'R$ 197';

  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{reseller.name}</p>
              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
              <Badge variant="outline" className="text-[10px]">
                <CreditCard className="mr-1 h-3 w-3" />
                {planLabel}
              </Badge>
              {reseller.custom_key_price && (
                <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                  <DollarSign className="mr-0.5 h-3 w-3" />
                  R$ {Number(reseller.custom_key_price).toFixed(2)}/key
                </Badge>
              )}
            </div>
            {reseller.email && <p className="text-xs text-muted-foreground">{reseller.email}</p>}
            {reseller.company && <p className="text-xs text-muted-foreground">{reseller.company}</p>}
            {reseller.phone && <p className="text-xs text-muted-foreground">{reseller.phone}</p>}
            <p className="text-[11px] text-muted-foreground">
              Cadastrado em {format(parseISO(reseller.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            {reseller.status === 'approved' && credits && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span>{credits.license_count} licenças</span>
                <span className="flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  <span className={available <= 0 ? 'text-destructive font-medium' : 'text-success font-medium'}>{available}</span>
                  <span>/ {credits.credits_total} créditos</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {onPlanChange && (
              <Select value={reseller.plan_type || '197'} onValueChange={onPlanChange}>
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="197">Plano R$ 197</SelectItem>
                  <SelectItem value="297">Plano R$ 297</SelectItem>
                  <SelectItem value="997">R$ 997 (Ilimitado)</SelectItem>
                </SelectContent>
              </Select>
            )}
            {onSetPrice && reseller.status === 'approved' && (
              <Button size="sm" variant="outline" onClick={onSetPrice}>
                <DollarSign className="mr-1 h-3.5 w-3.5" />Preço/Key
              </Button>
            )}
            {onAddCredits && reseller.status === 'approved' && (
              <Button size="sm" variant="outline" onClick={onAddCredits}>
                <Plus className="mr-1 h-3.5 w-3.5" />Créditos
              </Button>
            )}
            {onApprove && (
              <Button size="sm" onClick={onApprove} disabled={isPending}>
                <CheckCircle className="mr-1 h-3.5 w-3.5" />Aprovar
              </Button>
            )}
            {onReject && (
              <Button size="sm" variant="destructive" onClick={onReject} disabled={isPending}>
                <XCircle className="mr-1 h-3.5 w-3.5" />Rejeitar
              </Button>
            )}
            {onBlock && (
              <Button size="sm" variant="outline" onClick={onBlock} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                <Ban className="mr-1 h-3.5 w-3.5" />Bloquear
              </Button>
            )}
            {onUnblock && (
              <Button size="sm" variant="outline" onClick={onUnblock} className="text-success border-success/30 hover:bg-success/10">
                <Unlock className="mr-1 h-3.5 w-3.5" />Desbloquear
              </Button>
            )}
            {onDelete && (
              <Button size="sm" variant="ghost" onClick={onDelete} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
