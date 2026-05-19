import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings as SettingsIcon, Save, Plus, Trash2, RefreshCw, Eye, EyeOff, Globe, Key, Shield, Search, AlertCircle, Check, Bell } from 'lucide-react';
import { ResellerPricingSettings } from '@/components/admin/ResellerPricingSettings';
import { TokenPoolSettings } from '@/components/admin/TokenPoolSettings';
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
import { Badge } from '@/components/ui/badge';

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

type ConfigCategory = 'api' | 'webhook' | 'general' | 'other';

function getConfigCategory(key: string): ConfigCategory {
  const k = key.toLowerCase();
  if (k.includes('webhook') || k.includes('url')) return 'webhook';
  if (k.includes('key') || k.includes('token') || k.includes('secret') || k.includes('api')) return 'api';
  if (k.includes('price') || k.includes('pricing') || k.includes('tier')) return 'other';
  return 'general';
}

function getCategoryLabel(category: ConfigCategory): string {
  switch (category) {
    case 'api': return 'API & Chaves';
    case 'webhook': return 'Webhooks & URLs';
    case 'general': return 'Geral';
    default: return 'Outros';
  }
}

export default function Settings() {
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newConfig, setNewConfig] = useState({ key: '', value: '', description: '' });
  const [newConfigErrors, setNewConfigErrors] = useState<{key?: string; value?: string}>({});
  const [warningEnabled, setWarningEnabled] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [savingWarning, setSavingWarning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchConfigs();
    fetchWarningConfig();
  }, []);

  async function fetchWarningConfig() {
    const { data } = await supabase
      .from('system_config')
      .select('key, value')
      .in('key', ['reseller_no_keys_warning_enabled', 'reseller_no_keys_warning_message']);
    if (data) {
      const enabledRow = data.find(d => d.key === 'reseller_no_keys_warning_enabled');
      const messageRow = data.find(d => d.key === 'reseller_no_keys_warning_message');
      setWarningEnabled(enabledRow?.value === 'true');
      setWarningMessage(messageRow?.value || '');
    }
  }

  async function handleSaveWarning() {
    setSavingWarning(true);
    try {
      await supabase.from('system_config').update({ value: warningEnabled ? 'true' : 'false' }).eq('key', 'reseller_no_keys_warning_enabled');
      await supabase.from('system_config').update({ value: warningMessage }).eq('key', 'reseller_no_keys_warning_message');
      toast({ title: 'Aviso atualizado', description: 'Configuração do aviso salva com sucesso.' });
      fetchConfigs();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setSavingWarning(false);
    }
  }

  async function fetchConfigs() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .order('key');

      if (error) throw error;
      
      setConfigs(data || []);
      
      // Inicializar valores editados
      const values: Record<string, string> = {};
      data?.forEach(config => {
        values[config.id] = config.value;
      });
      setEditedValues(values);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar configurações',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(config: SystemConfig) {
    const newValue = editedValues[config.id];
    if (newValue === config.value) {
      toast({
        title: 'Sem alterações',
        description: 'O valor não foi alterado.',
      });
      return;
    }

    setSaving(config.id);
    try {
      const { error } = await supabase
        .from('system_config')
        .update({ value: newValue })
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: 'Configuração atualizada',
        description: `${config.key} foi atualizado com sucesso.`,
      });
      
      fetchConfigs();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(null);
    }
  }

  function validateNewConfig(): boolean {
    const errors: {key?: string; value?: string} = {};
    
    if (!newConfig.key.trim()) {
      errors.key = 'Chave é obrigatória';
    } else if (!/^[a-zA-Z0-9_]+$/.test(newConfig.key)) {
      errors.key = 'Use apenas letras, números e underscore';
    }
    
    if (!newConfig.value.trim()) {
      errors.value = 'Valor é obrigatório';
    }
    
    setNewConfigErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleAdd() {
    if (!validateNewConfig()) return;

    try {
      const { error } = await supabase
        .from('system_config')
        .insert({
          key: newConfig.key.toLowerCase().replace(/\s+/g, '_'),
          value: newConfig.value,
          description: newConfig.description || null,
        });

      if (error) throw error;

      toast({
        title: 'Configuração adicionada',
        description: `${newConfig.key} foi adicionada com sucesso.`,
      });
      
      setNewConfig({ key: '', value: '', description: '' });
      setNewConfigErrors({});
      setIsAddDialogOpen(false);
      fetchConfigs();
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  async function handleDelete(config: SystemConfig) {
    try {
      const { error } = await supabase
        .from('system_config')
        .delete()
        .eq('id', config.id);

      if (error) throw error;

      toast({
        title: 'Configuração removida',
        description: `${config.key} foi removida.`,
      });
      
      fetchConfigs();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    }
  }

  function toggleShowValue(id: string) {
    setShowValues(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function getConfigIcon(key: string) {
    if (key.includes('webhook') || key.includes('url')) {
      return <Globe className="h-5 w-5 text-blue-500" />;
    }
    if (key.includes('key') || key.includes('token') || key.includes('secret')) {
      return <Key className="h-5 w-5 text-amber-500" />;
    }
    return <Shield className="h-5 w-5 text-primary" />;
  }

  function isSensitive(key: string) {
    return key.includes('key') || key.includes('token') || key.includes('secret') || key.includes('password');
  }

  const filteredConfigs = useMemo(() => {
    if (!searchQuery.trim()) return configs;
    const q = searchQuery.toLowerCase();
    return configs.filter(c => 
      c.key.toLowerCase().includes(q) || 
      (c.description && c.description.toLowerCase().includes(q)) ||
      c.value.toLowerCase().includes(q)
    );
  }, [configs, searchQuery]);

  const configsByCategory = useMemo(() => {
    const groups: Record<ConfigCategory, SystemConfig[]> = {
      api: [],
      webhook: [],
      general: [],
      other: []
    };
    filteredConfigs.forEach(c => {
      groups[getConfigCategory(c.key)].push(c);
    });
    return groups;
  }, [filteredConfigs]);

  const hasChanges = (configId: string) => {
    const config = configs.find(c => c.id === configId);
    return config && editedValues[configId] !== config.value;
  };

  return (
    <AdminLayout>
      <div className="space-y-6 px-1 sm:px-0 pt-12 lg:pt-0">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-medium">Configurações</h1>
            <p className="text-sm text-muted-foreground">
              Configurações sensíveis do sistema
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={fetchConfigs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Configuração
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Configuração</DialogTitle>
                  <DialogDescription>
                    Adicione uma nova configuração do sistema. Use snake_case para a chave.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="key">Chave *</Label>
                    <Input
                      id="key"
                      placeholder="ex: api_key, webhook_url"
                      value={newConfig.key}
                      onChange={(e) => {
                        setNewConfig(prev => ({ ...prev, key: e.target.value }));
                        if (newConfigErrors.key) setNewConfigErrors(prev => ({ ...prev, key: undefined }));
                      }}
                      className={newConfigErrors.key ? 'border-destructive' : ''}
                    />
                    {newConfigErrors.key && <p className="text-xs text-destructive">{newConfigErrors.key}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Valor *</Label>
                    <Input
                      id="value"
                      placeholder="Valor da configuração"
                      value={newConfig.value}
                      onChange={(e) => {
                        setNewConfig(prev => ({ ...prev, value: e.target.value }));
                        if (newConfigErrors.value) setNewConfigErrors(prev => ({ ...prev, value: undefined }));
                      }}
                      className={newConfigErrors.value ? 'border-destructive' : ''}
                    />
                    {newConfigErrors.value && <p className="text-xs text-destructive">{newConfigErrors.value}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="Descrição opcional"
                      value={newConfig.description}
                      onChange={(e) => setNewConfig(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAdd}>
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar configurações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Config Cards by Category */}
        {loading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-2/3 mt-2" />
                </CardHeader>
                <CardContent>
                  <div className="h-10 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredConfigs.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              {searchQuery ? (
                <>
                  <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma configuração encontrada</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Não encontramos configurações correspondentes à busca.
                  </p>
                  <Button variant="outline" onClick={() => setSearchQuery('')}>
                    Limpar busca
                  </Button>
                </>
              ) : (
                <>
                  <SettingsIcon className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma configuração</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Adicione configurações do sistema como webhooks, API keys, etc.
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Configuração
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {(Object.keys(configsByCategory) as ConfigCategory[]).map(category => {
              const categoryConfigs = configsByCategory[category];
              if (categoryConfigs.length === 0) return null;
              
              return (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {getCategoryLabel(category)}
                    </h2>
                    <Badge variant="secondary" className="text-xs">
                      {categoryConfigs.length}
                    </Badge>
                  </div>
                  <div className="grid gap-3">
                    {categoryConfigs.map(config => (
                      <Card key={config.id} className={hasChanges(config.id) ? 'border-warning/50' : undefined}>
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              {getConfigIcon(config.key)}
                              <div>
                                <CardTitle className="text-lg font-mono">
                                  {config.key}
                                </CardTitle>
                                {config.description && (
                                  <CardDescription className="mt-1">
                                    {config.description}
                                  </CardDescription>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {hasChanges(config.id) && (
                                <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Modificado
                                </Badge>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover configuração?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja remover <strong>{config.key}</strong>? 
                                      Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(config)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                type={isSensitive(config.key) && !showValues[config.id] ? 'password' : 'text'}
                                value={editedValues[config.id] || ''}
                                onChange={(e) => setEditedValues(prev => ({ ...prev, [config.id]: e.target.value }))}
                                className="pr-10 font-mono text-sm"
                              />
                              {isSensitive(config.key) && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full"
                                  onClick={() => toggleShowValue(config.id)}
                                >
                                  {showValues[config.id] ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                            <Button
                              onClick={() => handleSave(config)}
                              disabled={saving === config.id || !hasChanges(config.id)}
                              variant={hasChanges(config.id) ? 'default' : 'outline'}
                            >
                              {saving === config.id ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : hasChanges(config.id) ? (
                                <Save className="h-4 w-4" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                              <span className="ml-2 hidden sm:inline">
                                {saving === config.id ? 'Salvando...' : 'Salvar'}
                              </span>
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Atualizado em: {new Date(config.updated_at).toLocaleString('pt-BR')}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Aviso para Revendedores */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <CardTitle className="text-lg">Aviso para Revendedores</CardTitle>
                <CardDescription>
                  Exibe um banner no painel dos revendedores que não possuem nenhuma licença ativa
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="warning-toggle" className="text-sm font-medium">Aviso ativo</Label>
              <Switch
                id="warning-toggle"
                checked={warningEnabled}
                onCheckedChange={setWarningEnabled}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warning-msg" className="text-sm font-medium">Mensagem</Label>
              <Textarea
                id="warning-msg"
                value={warningMessage}
                onChange={(e) => setWarningMessage(e.target.value)}
                rows={3}
                placeholder="Mensagem para revendedores sem keys ativas..."
              />
            </div>
            <Button onClick={handleSaveWarning} disabled={savingWarning}>
              {savingWarning ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Aviso
            </Button>
          </CardContent>
        </Card>

        {/* Token Pool */}
        <TokenPoolSettings />

        {/* Reseller Pricing */}
        <ResellerPricingSettings />

        {/* Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Segurança</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• As configurações são armazenadas de forma segura no banco de dados</li>
              <li>• Apenas administradores têm acesso a esta página</li>
              <li>• O webhook URL é fornecido apenas para licenças válidas</li>
              <li>• Alterações são auditadas automaticamente</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
