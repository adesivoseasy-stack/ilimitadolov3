import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertTriangle, Search, Globe, Shield, RefreshCw, MessageSquare, FolderGit2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface IpRow {
  id: string;
  license_id: string;
  ip_address: string;
  user_agent: string | null;
  hwid: string | null;
  access_count: number;
  first_seen_at: string;
  last_seen_at: string;
  license?: {
    license_key: string;
    email: string;
    status: string;
    customer_name: string | null;
  };
}

export default function IpAudit() {
  const [search, setSearch] = useState('');
  const [usageSearch, setUsageSearch] = useState('');
  const { toast } = useToast();

  // Uso por licença: mensagens + projetos únicos
  const { data: usage, isLoading: usageLoading, refetch: refetchUsage } = useQuery({
    queryKey: ['license-usage-audit'],
    queryFn: async () => {
      const { data: tracking, error } = await supabase
        .from('license_project_tracking')
        .select('license_id, project_id, message_count, last_seen_at')
        .order('last_seen_at', { ascending: false })
        .limit(5000);
      if (error) throw error;

      const ids = Array.from(new Set((tracking || []).map((t: any) => t.license_id)));
      const licMap = new Map<string, any>();
      for (let i = 0; i < ids.length; i += 200) {
        const { data: lics } = await supabase
          .from('licenses')
          .select('id, license_key, email, status, customer_name, messages_used, is_wildcard, last_message_at')
          .in('id', ids.slice(i, i + 200));
        (lics || []).forEach((l: any) => licMap.set(l.id, l));
      }

      const grouped = new Map<string, any>();
      (tracking || []).forEach((t: any) => {
        const cur = grouped.get(t.license_id) || {
          license_id: t.license_id,
          projects: new Set<string>(),
          messages: 0,
          last_seen: t.last_seen_at,
        };
        cur.projects.add(t.project_id);
        cur.messages += t.message_count || 0;
        if (t.last_seen_at > cur.last_seen) cur.last_seen = t.last_seen_at;
        grouped.set(t.license_id, cur);
      });

      return Array.from(grouped.values())
        .map((g) => {
          const lic = licMap.get(g.license_id);
          return {
            license_id: g.license_id,
            license: lic,
            project_count: g.projects.size,
            projects: Array.from(g.projects) as string[],
            tracked_messages: g.messages,
            total_messages: Math.max(g.messages, lic?.messages_used || 0),
            last_seen: g.last_seen,
          };
        })
        .sort((a, b) => b.total_messages - a.total_messages);
    },
  });

  const { data: ips, isLoading, refetch } = useQuery({
    queryKey: ['license-ip-tracking'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('license_ip_tracking')
        .select('*, licenses!license_ip_tracking_license_id_fkey(license_key, email, status, customer_name)')
        .order('last_seen_at', { ascending: false })
        .limit(500);

      if (error) {
        // Fallback se o join falhar (sem FK explícita)
        const { data: raw, error: e2 } = await supabase
          .from('license_ip_tracking')
          .select('*')
          .order('last_seen_at', { ascending: false })
          .limit(500);
        if (e2) throw e2;
        const ids = Array.from(new Set((raw || []).map((r: any) => r.license_id)));
        const { data: lics } = await supabase
          .from('licenses')
          .select('id, license_key, email, status, customer_name')
          .in('id', ids);
        const map = new Map((lics || []).map((l: any) => [l.id, l]));
        return (raw || []).map((r: any) => ({ ...r, license: map.get(r.license_id) })) as IpRow[];
      }
      return (data || []).map((r: any) => ({ ...r, license: r.licenses })) as IpRow[];
    },
  });

  // Agrupa por licença para mostrar suspeitas
  const suspicious = (() => {
    if (!ips) return [];
    const grouped = new Map<string, IpRow[]>();
    ips.forEach((ip) => {
      const arr = grouped.get(ip.license_id) || [];
      arr.push(ip);
      grouped.set(ip.license_id, arr);
    });
    return Array.from(grouped.entries())
      .filter(([, rows]) => rows.length > 1)
      .map(([license_id, rows]) => ({
        license_id,
        license: rows[0].license,
        ip_count: rows.length,
        ips: rows,
        last_seen: rows.reduce((max, r) => (r.last_seen_at > max ? r.last_seen_at : max), rows[0].last_seen_at),
      }))
      .sort((a, b) => b.ip_count - a.ip_count);
  })();

  const filtered = (ips || []).filter((ip) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      ip.ip_address.toLowerCase().includes(s) ||
      ip.license?.license_key.toLowerCase().includes(s) ||
      ip.license?.email.toLowerCase().includes(s) ||
      ip.user_agent?.toLowerCase().includes(s)
    );
  });

  const handleRevoke = async (license_id: string, license_key?: string) => {
    if (!confirm(`Revogar a licença ${license_key || license_id}?`)) return;
    const { error } = await supabase
      .from('licenses')
      .update({ status: 'revoked', revoked_at: new Date().toISOString() })
      .eq('id', license_id);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.from('license_logs').insert({
      license_id,
      action: 'manual_revoke_ip_audit',
      details: { revoked_from: 'admin_ip_audit_panel' },
    });
    toast({ title: 'Licença revogada', description: 'A licença foi revogada por abuso de IP.' });
    refetch();
    refetchUsage();
  };

  const filteredUsage = (usage || []).filter((u) => {
    if (!usageSearch) return true;
    const s = usageSearch.toLowerCase();
    return (
      u.license?.license_key?.toLowerCase().includes(s) ||
      u.license?.email?.toLowerCase().includes(s) ||
      u.license?.customer_name?.toLowerCase().includes(s) ||
      u.projects.some((p) => p.toLowerCase().includes(s))
    );
  });

  const totalMessages = (usage || []).reduce((sum, u) => sum + u.total_messages, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="h-7 w-7 text-primary" />
              Auditoria de IPs
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Detecção e revogação automática de licenças compartilhadas. Limite atual: <strong>1 IP único por 24h</strong>.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { refetch(); refetchUsage(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Mensagens totais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{totalMessages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Licenças com uso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{usage?.length ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total de IPs rastreados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{ips?.length ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Licenças suspeitas (≥2 IPs)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{suspicious.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Auto-revogadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">
                {suspicious.filter((s) => s.license?.status === 'revoked').length}
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="suspicious">
          <TabsList>
            <TabsTrigger value="usage">
              <MessageSquare className="h-4 w-4 mr-2" /> Uso por licença ({usage?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="suspicious">
              <AlertTriangle className="h-4 w-4 mr-2" /> Suspeitas ({suspicious.length})
            </TabsTrigger>
            <TabsTrigger value="all">
              <Globe className="h-4 w-4 mr-2" /> Todos os IPs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="usage">
            <Card>
              <CardHeader>
                <CardTitle>Mensagens e projetos por licença</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por chave, email, cliente ou projeto..."
                    value={usageSearch}
                    onChange={(e) => setUsageSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {usageLoading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
                ) : filteredUsage.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Nenhum uso registrado ainda.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Licença</TableHead>
                          <TableHead>Mensagens</TableHead>
                          <TableHead>Projetos</TableHead>
                          <TableHead>Última atividade</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsage.slice(0, 300).map((u) => (
                          <TableRow key={u.license_id}>
                            <TableCell>
                              <code className="text-xs font-mono">{u.license?.license_key || u.license_id.slice(0, 8)}</code>
                              <p className="text-xs text-muted-foreground">
                                {u.license?.email}{u.license?.customer_name ? ` • ${u.license.customer_name}` : ''}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="gap-1">
                                <MessageSquare className="h-3 w-3" /> {u.total_messages}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.project_count > 2 && !u.license?.is_wildcard ? 'destructive' : 'outline'} className="gap-1">
                                <FolderGit2 className="h-3 w-3" /> {u.project_count}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(u.last_seen), { locale: ptBR, addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={u.license?.status === 'revoked' ? 'destructive' : 'outline'}>
                                {u.license?.is_wildcard ? 'vitalícia' : u.license?.status || '?'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {u.license && u.license.status !== 'revoked' && (
                                <Button variant="ghost" size="sm" onClick={() => handleRevoke(u.license_id, u.license?.license_key)}>
                                  Revogar
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suspicious" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Licenças com múltiplos IPs detectados</CardTitle>
              </CardHeader>
              <CardContent>
                {suspicious.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    Nenhuma licença suspeita no momento. 🎉
                  </p>
                ) : (
                  <div className="space-y-4">
                    {suspicious.map((s) => (
                      <Card key={s.license_id} className="border-destructive/30">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                  {s.license?.license_key || s.license_id}
                                </code>
                                <Badge variant={s.license?.status === 'revoked' ? 'destructive' : 'outline'}>
                                  {s.license?.status || 'unknown'}
                                </Badge>
                                <Badge variant="destructive">{s.ip_count} IPs</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {s.license?.email} {s.license?.customer_name && `• ${s.license.customer_name}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Última atividade: {formatDistanceToNow(new Date(s.last_seen), { locale: ptBR, addSuffix: true })}
                              </p>
                            </div>
                            {s.license?.status !== 'revoked' && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRevoke(s.license_id, s.license?.license_key)}
                              >
                                Revogar agora
                              </Button>
                            )}
                          </div>
                          <div className="mt-4 border-t pt-4">
                            <p className="text-xs font-medium mb-2 text-muted-foreground">IPs registrados:</p>
                            <div className="space-y-1">
                              {s.ips.map((ip) => (
                                <div key={ip.id} className="flex items-center justify-between text-xs gap-2 flex-wrap py-1">
                                  <code className="font-mono">{ip.ip_address}</code>
                                  <span className="text-muted-foreground">
                                    {ip.access_count}x • {formatDistanceToNow(new Date(ip.last_seen_at), { locale: ptBR, addSuffix: true })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>Histórico completo de IPs</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por IP, chave, email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Carregando...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>IP</TableHead>
                          <TableHead>Licença</TableHead>
                          <TableHead>Acessos</TableHead>
                          <TableHead>Último visto</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered.slice(0, 200).map((ip) => (
                          <TableRow key={ip.id}>
                            <TableCell><code className="text-xs font-mono">{ip.ip_address}</code></TableCell>
                            <TableCell>
                              <code className="text-xs font-mono">{ip.license?.license_key || ip.license_id.slice(0, 8)}</code>
                              <p className="text-xs text-muted-foreground">{ip.license?.email}</p>
                            </TableCell>
                            <TableCell>{ip.access_count}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(ip.last_seen_at), { locale: ptBR, addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={ip.license?.status === 'revoked' ? 'destructive' : 'outline'}>
                                {ip.license?.status || '?'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
