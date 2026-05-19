import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, RefreshCw, Eye, EyeOff, Zap, Clock, AlertTriangle, Download, History, CheckCircle, XCircle } from 'lucide-react';
import JSZip from 'jszip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface TokenPoolEntry {
  id: string;
  token: string;
  refresh_token: string | null;
  account_label: string;
  is_active: boolean;
  use_count: number;
  last_used_at: string | null;
  expires_at: string | null;
  captured_at: string;
  created_at: string;
}

interface RefreshLog {
  id: string;
  token_id: string | null;
  account_label: string;
  status: string;
  error_message: string | null;
  old_expires_at: string | null;
  new_expires_at: string | null;
  created_at: string;
}

export function TokenPoolSettings() {
  const [tokens, setTokens] = useState<TokenPoolEntry[]>([]);
  const [refreshLogs, setRefreshLogs] = useState<RefreshLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [newToken, setNewToken] = useState({
    account_label: '',
    token: '',
    refresh_token: '',
  });
  const { toast } = useToast();

  // Check for recent failures to show alert banner
  const recentFailures = refreshLogs.filter(l => l.status !== 'success' && 
    new Date(l.created_at).getTime() > Date.now() - 24 * 60 * 60 * 1000);

  useEffect(() => {
    fetchTokens();
    fetchRefreshLogs();
  }, []);

  async function fetchRefreshLogs() {
    try {
      const { data } = await supabase
        .from('token_refresh_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setRefreshLogs((data as RefreshLog[]) || []);
    } catch {}
  }

  async function fetchTokens() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('token_pool')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTokens((data as TokenPoolEntry[]) || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar tokens',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd() {
    if (!newToken.token.trim() || !newToken.refresh_token.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Token JWT e Refresh Token são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Decode JWT to get expiry
      let expiresAt: string | null = null;
      try {
        const payload = JSON.parse(atob(newToken.token.split('.')[1]));
        if (payload.exp) {
          expiresAt = new Date(payload.exp * 1000).toISOString();
        }
      } catch {
        // If we can't decode, leave expires_at null
      }

      const { error } = await supabase.from('token_pool').insert({
        token: newToken.token.trim(),
        refresh_token: newToken.refresh_token.trim(),
        account_label: newToken.account_label.trim() || 'Conta ' + (tokens.length + 1),
        expires_at: expiresAt,
      });

      if (error) throw error;

      toast({ title: 'Token adicionado com sucesso' });
      setNewToken({ account_label: '', token: '', refresh_token: '' });
      setIsAddOpen(false);
      fetchTokens();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(id: string) {
    try {
      const { error } = await supabase.from('token_pool').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Token removido' });
      fetchTokens();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      const { error } = await supabase
        .from('token_pool')
        .update({ is_active: !currentActive })
        .eq('id', id);
      if (error) throw error;
      fetchTokens();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  }

  async function handleRefreshAll() {
    setRefreshing(true);
    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/refresh-tokens`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manual: true }),
        }
      );

      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: 'Tokens renovados',
          description: `${data.refreshed || 0} renovados, ${data.failed || 0} falharam`,
        });
        fetchTokens();
        fetchRefreshLogs();
      } else {
        throw new Error(data.error || 'Falha ao renovar');
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao renovar tokens',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  }

  function getTokenStatus(token: TokenPoolEntry) {
    if (!token.is_active) return { label: 'Inativo', variant: 'secondary' as const, icon: AlertTriangle };
    if (!token.expires_at) return { label: 'Ativo', variant: 'default' as const, icon: Zap };
    
    const now = new Date();
    const expires = new Date(token.expires_at);
    const minutesLeft = (expires.getTime() - now.getTime()) / 60000;

    if (minutesLeft < 0) return { label: 'Expirado', variant: 'destructive' as const, icon: AlertTriangle };
    if (minutesLeft < 10) return { label: `${Math.round(minutesLeft)}min`, variant: 'destructive' as const, icon: Clock };
    if (minutesLeft < 30) return { label: `${Math.round(minutesLeft)}min`, variant: 'secondary' as const, icon: Clock };
    return { label: 'Ativo', variant: 'default' as const, icon: Zap };
  }

  function maskToken(value: string) {
    if (value.length <= 20) return '••••••••';
    return value.substring(0, 10) + '•••' + value.substring(value.length - 10);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Token Pool
            </CardTitle>
            <CardDescription>
              Tokens JWT do Lovable com renovação automática a cada 30 min
            </CardDescription>
            <CardDescription className="text-xs mt-1">
              Use a extensão utilitária para capturar tokens facilmente
            </CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const zip = new JSZip();
                const files = ['manifest.json', 'popup.html', 'popup.js'];
                for (const f of files) {
                  try {
                    const res = await fetch(`/token-grabber/${f}`);
                    if (res.ok) zip.file(f, await res.text());
                  } catch {}
                }
                const blob = await zip.generateAsync({ type: 'blob' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'lovable-token-grabber.zip';
                a.click();
                URL.revokeObjectURL(url);
                toast({ title: 'Extensão baixada!', description: 'Instale no Chrome em modo desenvolvedor.' });
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Token Grabber
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Renovar Agora
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Adicionar Token ao Pool</DialogTitle>
                  <DialogDescription>
                    Adicione um JWT e Refresh Token de uma conta Lovable. O sistema renovará automaticamente.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome da conta</Label>
                    <Input
                      placeholder="ex: Conta Principal, Conta 2..."
                      value={newToken.account_label}
                      onChange={(e) => setNewToken(prev => ({ ...prev, account_label: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>JWT Token *</Label>
                    <Input
                      placeholder="eyJhbGciOi..."
                      value={newToken.token}
                      onChange={(e) => setNewToken(prev => ({ ...prev, token: e.target.value }))}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Token atual da conta (expira em ~1h, será renovado automaticamente)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Refresh Token *</Label>
                    <Input
                      placeholder="AMf-vBx..."
                      value={newToken.refresh_token}
                      onChange={(e) => setNewToken(prev => ({ ...prev, refresh_token: e.target.value }))}
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Usado para renovar o JWT automaticamente (dura meses)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                  <Button onClick={handleAdd}>Adicionar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum token no pool</p>
            <p className="text-xs mt-1">Adicione tokens JWT + Refresh Token para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tokens.map(token => {
              const status = getTokenStatus(token);
              const StatusIcon = status.icon;
              return (
                <div
                  key={token.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    token.is_active ? 'bg-card' : 'bg-muted/50 opacity-60'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{token.account_label}</span>
                      <Badge variant={status.variant} className="text-xs gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                      {!token.refresh_token && (
                        <Badge variant="outline" className="text-xs text-amber-600">
                          Sem refresh
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Usos: {token.use_count}</span>
                      {token.last_used_at && (
                        <span>Último: {new Date(token.last_used_at).toLocaleString('pt-BR')}</span>
                      )}
                      {token.expires_at && (
                        <span>Expira: {new Date(token.expires_at).toLocaleString('pt-BR')}</span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <code className="text-xs text-muted-foreground">
                        {showTokens[token.id] ? token.token.substring(0, 80) + '...' : maskToken(token.token)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => setShowTokens(prev => ({ ...prev, [token.id]: !prev[token.id] }))}
                      >
                        {showTokens[token.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(token.id, token.is_active)}
                      className="text-xs"
                    >
                      {token.is_active ? 'Desativar' : 'Ativar'}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remover token?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remover "{token.account_label}" do pool? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(token.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Remover
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Failure Alert Banner */}
        {recentFailures.length > 0 && (
          <div className="mt-4 p-3 rounded-lg border border-destructive/50 bg-destructive/10">
            <div className="flex items-center gap-2 text-destructive mb-1">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium text-sm">
                {recentFailures.length} falha(s) nas últimas 24h
              </span>
            </div>
            <div className="space-y-1">
              {recentFailures.slice(0, 3).map(log => (
                <p key={log.id} className="text-xs text-destructive/80">
                  • {log.account_label}: {log.error_message || 'Erro desconhecido'}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Refresh Logs Toggle */}
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowLogs(!showLogs)}
          >
            <History className="h-3 w-3 mr-1" />
            {showLogs ? 'Ocultar logs' : 'Ver logs de refresh'}
          </Button>

          {showLogs && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {refreshLogs.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">Nenhum log de refresh ainda</p>
              ) : (
                refreshLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-2 text-xs p-2 rounded border bg-card">
                    {log.status === 'success' ? (
                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                    )}
                    <span className="font-medium min-w-[100px]">{log.account_label}</span>
                    <span className="text-muted-foreground flex-1 truncate">
                      {log.status === 'success'
                        ? `Renovado até ${log.new_expires_at ? new Date(log.new_expires_at).toLocaleString('pt-BR') : '?'}`
                        : log.error_message || 'Falha'}
                    </span>
                    <span className="text-muted-foreground flex-shrink-0">
                      {new Date(log.created_at).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
