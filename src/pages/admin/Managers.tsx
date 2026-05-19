import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Trash2, Users, ArrowUpCircle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ManagerRole {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
}

function useManagers() {
  return useQuery({
    queryKey: ['managers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'manager')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const managers = (data || []) as ManagerRole[];

      // Fetch emails for all managers
      if (managers.length > 0) {
        const userIds = managers.map(m => m.user_id);
        const { data: emailData } = await supabase.functions.invoke('get-user-emails', {
          body: { userIds },
        });
        if (emailData?.emails) {
          return managers.map(m => ({ ...m, email: emailData.emails[m.user_id] || m.user_id }));
        }
      }

      return managers.map(m => ({ ...m, email: m.user_id }));
    },
  });
}

function useCreateManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await supabase.functions.invoke('create-manager-user', {
        body: { email, password },
      });
      // Edge function errors come as FunctionsHttpError with the response body
      if (response.error) {
        let msg = 'Erro ao criar gerente';
        try {
          const body = await response.error.context?.json?.() ?? response.data;
          if (body?.error) {
            if (body.error.includes('already been registered')) {
              msg = 'Este email já está cadastrado no sistema.';
            } else {
              msg = body.error;
            }
          }
        } catch { /* use default msg */ }
        throw new Error(msg);
      }
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      toast({ title: 'Gerente criado', description: 'A conta de gerente foi criada com sucesso.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message || 'Não foi possível criar o gerente.', variant: 'destructive' });
    },
  });
}

function useDeleteManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'manager');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      toast({ title: 'Gerente removido', description: 'O papel de gerente foi removido.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message || 'Não foi possível remover o gerente.', variant: 'destructive' });
    },
  });
}

function usePromoteToAdmin() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      // Add admin role
      const { error: insertError } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'admin' as const });
      if (insertError) throw new Error(insertError.message);
      // Remove manager role
      const { error: deleteError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', 'manager' as const);
      if (deleteError) throw new Error(deleteError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['managers'] });
      toast({ title: 'Promovido a Admin', description: 'O gerente foi promovido a administrador.' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro', description: error.message || 'Não foi possível promover o gerente.', variant: 'destructive' });
    },
  });
}

export default function Managers() {
  const { data: managers, isLoading } = useManagers();
  const createManager = useCreateManager();
  const deleteManager = useDeleteManager();
  const promoteToAdmin = usePromoteToAdmin();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<ManagerRole | null>(null);
  const [promoteConfirm, setPromoteConfirm] = useState<ManagerRole | null>(null);

  const handleCreate = async () => {
    if (!newEmail || !newPassword) return;

    try {
      await createManager.mutateAsync({ email: newEmail, password: newPassword });
      setIsCreateOpen(false);
      setNewEmail('');
      setNewPassword('');
    } catch {
      // error toast is already handled by the mutation
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 px-1 sm:px-0 pt-12 lg:pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-medium text-foreground">Gerentes</h1>
            <p className="text-sm text-muted-foreground">Gerencie contas de gerentes do sistema</p>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={(open) => { setIsCreateOpen(open); if (!open) { setNewEmail(''); setNewPassword(''); } }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-3.5 w-3.5" />Novo Gerente</Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Criar Gerente</DialogTitle>
                <DialogDescription>Crie uma conta de gerente para administrar revendedores e licenças</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" placeholder="gerente@exemplo.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsCreateOpen(false); setNewEmail(''); setNewPassword(''); }}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={createManager.isPending || !newEmail || !newPassword}>
                  {createManager.isPending ? 'Criando...' : 'Criar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Total de Gerentes</span>
                <Shield className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-xl font-semibold tabular-nums text-primary">{isLoading ? '—' : managers?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Manager list */}
        {isLoading && <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>}

        {!isLoading && managers && managers.length > 0 && (
          <div className="space-y-3">
            {managers.map((manager) => (
              <Card key={manager.id} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <p className="text-sm font-medium">{manager.email || manager.user_id}</p>
                        <Badge variant="default">Gerente</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Desde {format(parseISO(manager.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setPromoteConfirm(manager)} className="text-primary border-primary/30 hover:bg-primary/10">
                        <ArrowUpCircle className="mr-1 h-3.5 w-3.5" />Promover
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleteConfirm(manager)} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!isLoading && (!managers || managers.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum gerente cadastrado</p>
        )}

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover gerente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover o papel de gerente deste usuário? Ele perderá acesso ao painel de gerência.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteConfirm) {
                    deleteManager.mutate({ userId: deleteConfirm.user_id });
                    setDeleteConfirm(null);
                  }
                }}
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Promote Confirmation */}
        <AlertDialog open={!!promoteConfirm} onOpenChange={(open) => { if (!open) setPromoteConfirm(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Promover a Admin</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja promover este gerente a administrador? Ele terá acesso total ao sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (promoteConfirm) {
                    promoteToAdmin.mutate({ userId: promoteConfirm.user_id });
                    setPromoteConfirm(null);
                  }
                }}
              >
                Promover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
