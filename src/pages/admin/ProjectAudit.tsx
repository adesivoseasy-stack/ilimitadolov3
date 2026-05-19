import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertTriangle, Ban, FolderGit2, RefreshCw, RotateCcw, Search, ShieldAlert } from 'lucide-react';

import { AdminLayout } from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface LicenseInfo {
  id: string;
  license_key: string;
  email: string;
  status: string;
  customer_name: string | null;
  revoked_at: string | null;
}

interface ProjectRow {
  id: string;
  license_id: string;
  project_id: string;
  message_count: number;
  first_seen_at: string;
  last_seen_at: string;
  license?: LicenseInfo;
}

interface ProjectLog {
  id: string;
  license_id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
  license?: LicenseInfo;
}

const toTextArray = (value: unknown) => (Array.isArray(value) ? value.map(String) : []);

export default function ProjectAudit() {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['project-abuse-audit'],
    queryFn: async () => {
      const [{ data: tracking, error: trackingError }, { data: logs, error: logsError }] = await Promise.all([
        supabase
          .from('license_project_tracking' as never)
          .select('*')
          .order('last_seen_at', { ascending: false })
          .limit(1000),
        supabase
          .from('license_logs')
          .select('*')
          .eq('action', 'auto_revoked_project_abuse')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      if (trackingError) throw trackingError;
      if (logsError) throw logsError;

      const licenseIds = Array.from(
        new Set([
          ...((tracking || []) as ProjectRow[]).map((row) => row.license_id),
          ...((logs || []) as ProjectLog[]).map((log) => log.license_id),
        ]),
      );

      const { data: licenses, error: licenseError } = licenseIds.length
        ? await supabase
            .from('licenses')
            .select('id, license_key, email, status, customer_name, revoked_at')
            .in('id', licenseIds)
        : { data: [], error: null };

      if (licenseError) throw licenseError;

      const licenseMap = new Map((licenses || []).map((license) => [license.id, license as LicenseInfo]));

      return {
        tracking: ((tracking || []) as ProjectRow[]).map((row) => ({ ...row, license: licenseMap.get(row.license_id) })),
        logs: ((logs || []) as ProjectLog[]).map((log) => ({ ...log, license: licenseMap.get(log.license_id) })),
      };
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async ({ licenseId, licenseKey }: { licenseId: string; licenseKey: string }) => {
      const { error: updateError } = await supabase
        .from('licenses')
        .update({ status: 'active', revoked_at: null })
        .eq('id', licenseId)
        .select('id')
        .single();

      if (updateError) throw updateError;

      const { error: logError } = await supabase.from('license_logs').insert({
        license_id: licenseId,
        action: 'manual_restored_project_false_positive',
        details: {
          restored_from: 'project_audit',
          previous_reason: 'auto_revoked_project_abuse',
          license_key: licenseKey,
          restored_at: new Date().toISOString(),
        },
      });

      if (logError) throw logError;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['project-abuse-audit'] });
      toast({ title: 'Licença restaurada', description: 'A chave voltou para ativa e a ação foi registrada no histórico.' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao restaurar', description: (error as Error).message, variant: 'destructive' });
    },
  });

  const handleRestore = (license?: LicenseInfo) => {
    if (!license || license.status !== 'revoked') return;
    restoreMutation.mutate({ licenseId: license.id, licenseKey: license.license_key });
  };

  const grouped = useMemo(() => {
    const groups = new Map<string, ProjectRow[]>();
    (data?.tracking || []).forEach((row) => {
      groups.set(row.license_id, [...(groups.get(row.license_id) || []), row]);
    });

    return Array.from(groups.entries())
      .map(([licenseId, rows]) => {
        const sorted = [...rows].sort((a, b) => new Date(a.last_seen_at).getTime() - new Date(b.last_seen_at).getTime());
        const firstSeen = sorted[0]?.last_seen_at;
        const lastSeen = sorted[sorted.length - 1]?.last_seen_at;
        const windowSeconds = firstSeen && lastSeen
          ? Math.round((new Date(lastSeen).getTime() - new Date(firstSeen).getTime()) / 1000)
          : 0;

        return {
          licenseId,
          license: rows[0]?.license,
          projectCount: rows.length,
          messageCount: rows.reduce((total, row) => total + row.message_count, 0),
          rows: sorted,
          firstSeen,
          lastSeen,
          windowSeconds,
        };
      })
      .filter((group) => group.projectCount > 1 && group.windowSeconds <= 60)
      .sort((a, b) => b.projectCount - a.projectCount || b.messageCount - a.messageCount);
  }, [data?.tracking]);

  const bannedLogs = (data?.logs || []).filter((log) => {
    if (!search) return true;
    const term = search.toLowerCase();
    const projects = toTextArray(log.details?.projects).join(' ').toLowerCase();
    return (
      log.license?.license_key.toLowerCase().includes(term) ||
      log.license?.email.toLowerCase().includes(term) ||
      log.license?.customer_name?.toLowerCase().includes(term) ||
      projects.includes(term)
    );
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold">
              <ShieldAlert className="h-7 w-7 text-primary" />
              Auditoria de Projetos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Chaves banidas por uso em mais de 2 projetos no intervalo de 1 minuto.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Banidas por projetos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{data?.logs.length ?? 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Com mais de 1 projeto em 1 min</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{grouped.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Projetos rastreados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{data?.tracking.length ?? 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="banned">
          <TabsList>
            <TabsTrigger value="banned">
              <Ban className="mr-2 h-4 w-4" /> Banidas ({data?.logs.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="multi-project">
              <AlertTriangle className="mr-2 h-4 w-4" /> +1 projeto em 1 min ({grouped.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="banned">
            <Card>
              <CardHeader>
                <CardTitle>Chaves auto-banidas por abuso de projetos</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por chave, email, cliente ou projeto..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
                ) : bannedLogs.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma chave banida por projetos encontrada.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Licença</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Projetos</TableHead>
                          <TableHead>Limite</TableHead>
                          <TableHead>Quando</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bannedLogs.map((log) => {
                          const projects = toTextArray(log.details?.projects);
                          return (
                            <TableRow key={log.id}>
                              <TableCell>
                                <code className="text-xs font-mono">{log.license?.license_key || log.license_id.slice(0, 8)}</code>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm">{log.license?.customer_name || 'Sem nome'}</p>
                                <p className="text-xs text-muted-foreground">{log.license?.email}</p>
                              </TableCell>
                              <TableCell>
                                <div className="flex max-w-[360px] flex-wrap gap-1">
                                  {projects.map((project) => (
                                    <Badge key={project} variant="outline" className="font-mono text-[10px]">
                                      {project}
                                    </Badge>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">
                                  {String(log.details?.unique_projects || '?')}/{String(log.details?.limit || 2)} em {String(log.details?.window_seconds || 60)}s
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                <Badge variant={log.license?.status === 'revoked' ? 'destructive' : 'outline'}>
                                  {log.license?.status || 'unknown'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={log.license?.status !== 'revoked' || restoreMutation.isPending}
                                  onClick={() => handleRestore(log.license)}
                                >
                                  <RotateCcw className="mr-2 h-4 w-4" /> Restaurar
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="multi-project" className="space-y-4">
            {grouped.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma chave com mais de 1 projeto dentro de 1 minuto no rastreamento atual.
                </CardContent>
              </Card>
            ) : (
              grouped.map((group) => (
                <Card key={group.licenseId}>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                          <FolderGit2 className="h-4 w-4 text-primary" />
                          <code className="font-mono text-sm">{group.license?.license_key || group.licenseId}</code>
                          <Badge variant={group.license?.status === 'revoked' ? 'destructive' : 'outline'}>{group.license?.status || 'unknown'}</Badge>
                        </CardTitle>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {group.license?.email} {group.license?.customer_name && `• ${group.license.customer_name}`}
                        </p>
                      </div>
                      <Badge variant="destructive">{group.projectCount} projetos em {group.windowSeconds}s</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {group.rows.map((row) => (
                        <div key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2 text-sm last:border-0">
                          <code className="font-mono text-xs">{row.project_id}</code>
                          <span className="text-xs text-muted-foreground">
                            {row.message_count} mensagens • {formatDistanceToNow(new Date(row.last_seen_at), { locale: ptBR, addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}