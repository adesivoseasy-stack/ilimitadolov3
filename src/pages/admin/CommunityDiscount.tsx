import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Flame, Save, Loader2, Plus, Trash2, RotateCcw, TrendingUp } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

interface Level {
  id: string;
  name: string;
  emoji: string;
  sales_required: number;
  discount_percentage: number;
  order_index: number;
}

interface Progress {
  reseller_id: string;
  current_sales: number;
  current_discount: number;
  current_level_id: string | null;
}

export default function CommunityDiscount() {
  const { toast } = useToast();
  const [levels, setLevels] = useState<Level[]>([]);
  const [progressList, setProgressList] = useState<Progress[]>([]);
  const [emailMap, setEmailMap] = useState<Record<string, string>>({});
  const [isActive, setIsActive] = useState(true);
  const [configId, setConfigId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [lvlRes, cfgRes, progRes] = await Promise.all([
      supabase.from('community_discount_levels' as any).select('*').order('order_index'),
      supabase.from('community_discount_config' as any).select('*').limit(1).maybeSingle(),
      supabase.from('reseller_community_progress' as any).select('*').order('current_sales', { ascending: false }),
    ]);
    if (lvlRes.data) setLevels(lvlRes.data as any);
    if (cfgRes.data) {
      setIsActive((cfgRes.data as any).is_active);
      setConfigId((cfgRes.data as any).id);
    }
    const prog = (progRes.data ?? []) as any as Progress[];
    setProgressList(prog);

    if (prog.length > 0) {
      try {
        const { data: emailsData } = await supabase.functions.invoke('get-user-emails', {
          body: { userIds: prog.map((p) => p.reseller_id) },
        });
        if (emailsData?.emails) setEmailMap(emailsData.emails);
      } catch {
        // silent
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateLevel = (id: string, patch: Partial<Level>) => {
    setLevels((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const addLevel = () => {
    const nextOrder = Math.max(0, ...levels.map((l) => l.order_index)) + 1;
    setLevels((prev) => [
      ...prev,
      { id: `new-${Date.now()}`, name: 'Novo', emoji: '🎯', sales_required: 100, discount_percentage: 20, order_index: nextOrder },
    ]);
  };

  const removeLevel = async (id: string) => {
    if (id.startsWith('new-')) {
      setLevels((prev) => prev.filter((l) => l.id !== id));
      return;
    }
    if (!confirm('Remover este nível?')) return;
    const { error } = await supabase.from('community_discount_levels' as any).delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    setLevels((prev) => prev.filter((l) => l.id !== id));
    toast({ title: 'Nível removido' });
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      if (configId) {
        await supabase.from('community_discount_config' as any).update({ is_active: isActive }).eq('id', configId);
      }
      for (const lvl of levels) {
        const payload = {
          name: lvl.name,
          emoji: lvl.emoji,
          sales_required: lvl.sales_required,
          discount_percentage: lvl.discount_percentage,
          order_index: lvl.order_index,
        };
        if (lvl.id.startsWith('new-')) {
          await supabase.from('community_discount_levels' as any).insert(payload);
        } else {
          await supabase.from('community_discount_levels' as any).update(payload).eq('id', lvl.id);
        }
      }
      for (const p of progressList) {
        await supabase.rpc('recalc_reseller_progress' as any, { _reseller_id: p.reseller_id });
      }
      toast({ title: 'Configurações salvas' });
      load();
    } catch (e) {
      toast({ title: 'Erro', description: getErrorMessage(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const resetAll = async () => {
    if (!confirm('Zerar as vendas de TODOS os revendedores? Essa ação não pode ser desfeita.')) return;
    const { error } = await supabase.rpc('admin_reset_community_progress' as any);
    if (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    toast({ title: 'Campanha zerada' });
    load();
  };

  const editReseller = async (resellerId: string, newSales: number) => {
    const level = levels
      .filter((l) => l.sales_required <= newSales)
      .sort((a, b) => b.order_index - a.order_index)[0];
    const nextLevel = levels
      .filter((l) => l.sales_required > newSales)
      .sort((a, b) => a.order_index - b.order_index)[0];
    const { error } = await supabase
      .from('reseller_community_progress' as any)
      .update({
        current_sales: newSales,
        current_level_id: level?.id ?? null,
        current_discount: level?.discount_percentage ?? 0,
        next_level_id: nextLevel?.id ?? null,
        sales_to_next: nextLevel ? nextLevel.sales_required - newSales : null,
      })
      .eq('reseller_id', resellerId);
    if (error) {
      toast({ title: 'Erro', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    toast({ title: 'Vendas atualizadas' });
    load();
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="pt-14 lg:pt-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-2 font-display">Marketing</p>
          <h1 className="text-3xl sm:text-5xl font-black text-gradient-white font-display">Desconto Progressivo</h1>
          <p className="text-sm text-muted-foreground mt-2">Gamifique a loja: recompense revendedores com % de desconto conforme sobem de nível.</p>
        </div>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Flame className="h-5 w-5 text-primary" /> Campanha</CardTitle>
            <div className="flex items-center gap-3">
              <Label htmlFor="active" className="text-sm">Ativa</Label>
              <Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </CardHeader>
        </Card>

        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Níveis</CardTitle>
            <Button size="sm" variant="outline" onClick={addLevel}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ordem</TableHead>
                    <TableHead>Emoji</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Vendas necessárias</TableHead>
                    <TableHead>% Desconto</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {levels.map((lvl) => (
                    <TableRow key={lvl.id}>
                      <TableCell><Input type="number" value={lvl.order_index} onChange={(e) => updateLevel(lvl.id, { order_index: parseInt(e.target.value || '0') })} className="w-20" /></TableCell>
                      <TableCell><Input value={lvl.emoji} onChange={(e) => updateLevel(lvl.id, { emoji: e.target.value })} className="w-20" /></TableCell>
                      <TableCell><Input value={lvl.name} onChange={(e) => updateLevel(lvl.id, { name: e.target.value })} className="w-32" /></TableCell>
                      <TableCell><Input type="number" value={lvl.sales_required} onChange={(e) => updateLevel(lvl.id, { sales_required: parseInt(e.target.value || '0') })} className="w-28" /></TableCell>
                      <TableCell><Input type="number" step="0.5" value={lvl.discount_percentage} onChange={(e) => updateLevel(lvl.id, { discount_percentage: parseFloat(e.target.value || '0') })} className="w-24" /></TableCell>
                      <TableCell><Button size="sm" variant="ghost" onClick={() => removeLevel(lvl.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={saveAll} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Salvar tudo
              </Button>
              <Button variant="destructive" onClick={resetAll}><RotateCcw className="h-4 w-4 mr-1" /> Resetar campanha</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Progresso dos revendedores</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : progressList.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum progresso registrado ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Revendedor</TableHead>
                      <TableHead>Vendas</TableHead>
                      <TableHead>Desconto atual</TableHead>
                      <TableHead>Editar vendas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {progressList.map((p) => (
                      <ResellerRow
                        key={p.reseller_id}
                        p={p}
                        email={emailMap[p.reseller_id]}
                        onSave={(n) => editReseller(p.reseller_id, n)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}

function ResellerRow({ p, email, onSave }: { p: Progress; email?: string; onSave: (n: number) => void }) {
  const [val, setVal] = useState<string>(String(p.current_sales));
  return (
    <TableRow>
      <TableCell className="text-xs">{email || p.reseller_id.slice(0, 8)}</TableCell>
      <TableCell className="font-mono text-sm">{p.current_sales}</TableCell>
      <TableCell><span className="text-primary font-bold">{p.current_discount}%</span></TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Input type="number" value={val} onChange={(e) => setVal(e.target.value)} className="w-24 h-8" />
          <Button size="sm" variant="outline" onClick={() => onSave(parseInt(val || '0'))}>Aplicar</Button>
        </div>
      </TableCell>
    </TableRow>
  );
}