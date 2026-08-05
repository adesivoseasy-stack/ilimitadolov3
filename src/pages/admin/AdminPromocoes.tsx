import { useState, useEffect, useCallback } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tag, Plus, Trash2, Pencil, Clock, Zap, Package, Star, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { format, parseISO, isAfter, isBefore, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  type: 'vitalicia' | 'pacote' | 'custom';
  price: number;
  quantity: number | null;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  highlight_color: string;
  created_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  vitalicia: '⚡ Vitalícia',
  pacote: '📦 Pacote de Chaves',
  custom: '🎯 Personalizada',
};

const COLOR_OPTIONS = [
  { label: 'Roxo', value: '#8B5CF6' },
  { label: 'Rosa', value: '#EC4899' },
  { label: 'Verde', value: '#10B981' },
  { label: 'Laranja', value: '#F59E0B' },
  { label: 'Azul', value: '#3B82F6' },
  { label: 'Vermelho', value: '#EF4444' },
];

const EMPTY: Omit<Promotion, 'id' | 'created_at'> = {
  title: '',
  description: '',
  type: 'vitalicia',
  price: 0,
  quantity: null,
  starts_at: new Date().toISOString().slice(0, 16),
  expires_at: null,
  is_active: true,
  highlight_color: '#8B5CF6',
};

function promoStatus(p: Promotion): 'active' | 'expired' | 'scheduled' | 'disabled' {
  if (!p.is_active) return 'disabled';
  const now = new Date();
  if (p.expires_at && isBefore(parseISO(p.expires_at), now)) return 'expired';
  if (isBefore(now, parseISO(p.starts_at))) return 'scheduled';
  return 'active';
}

export default function AdminPromocoes() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<'create' | 'edit' | null>(null);
  const [form, setForm] = useState<Omit<Promotion, 'id' | 'created_at'>>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });
    setPromos((data as Promotion[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setForm({ ...EMPTY, starts_at: new Date().toISOString().slice(0, 16) });
    setEditingId(null);
    setDialog('create');
  };

  const openEdit = (p: Promotion) => {
    setForm({
      title: p.title,
      description: p.description || '',
      type: p.type,
      price: p.price,
      quantity: p.quantity,
      starts_at: p.starts_at ? p.starts_at.slice(0, 16) : new Date().toISOString().slice(0, 16),
      expires_at: p.expires_at ? p.expires_at.slice(0, 16) : null,
      is_active: p.is_active,
      highlight_color: p.highlight_color || '#8B5CF6',
    });
    setEditingId(p.id);
    setDialog('edit');
  };

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast({ title: 'Título obrigatório', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        price: Number(form.price) || 0,
        quantity: form.quantity ? Number(form.quantity) : null,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : new Date().toISOString(),
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        description: form.description || null,
        updated_at: new Date().toISOString(),
      };

      if (dialog === 'create') {
        payload.created_by = user?.id;
        const { error } = await (supabase as any).from('promotions').insert(payload);
        if (error) throw error;
        toast({ title: '✅ Promoção criada!', description: form.title });
      } else {
        const { error } = await (supabase as any).from('promotions').update(payload).eq('id', editingId);
        if (error) throw error;
        toast({ title: '✅ Promoção atualizada!', description: form.title });
      }
      setDialog(null);
      load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: Promotion) => {
    await (supabase as any).from('promotions').update({ is_active: !p.is_active, updated_at: new Date().toISOString() }).eq('id', p.id);
    load();
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from('promotions').delete().eq('id', id);
    setDeleteConfirm(null);
    toast({ title: 'Promoção excluída' });
    load();
  };

  const patch = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));

  const activeCount = promos.filter(p => promoStatus(p) === 'active').length;

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display flex items-center gap-3">
              <Tag className="h-8 w-8 text-primary" />
              Promoções
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie promoções ativas que aparecem para seus revendedores
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2 bg-gradient hover:opacity-90 shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" />
            Nova Promoção
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Ativas agora', value: activeCount, icon: CheckCircle2, color: 'text-green-400' },
            { label: 'Total criadas', value: promos.length, icon: Tag, color: 'text-primary' },
            { label: 'Expiradas', value: promos.filter(p => promoStatus(p) === 'expired').length, icon: XCircle, color: 'text-red-400' },
          ].map(stat => (
            <Card key={stat.label} className="border-border/30 bg-card/60">
              <CardContent className="flex items-center gap-4 p-5">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-bold font-display">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : promos.length === 0 ? (
          <Card className="border-border/30 bg-card/60">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <Tag className="h-12 w-12 text-muted-foreground/30" />
              <div>
                <p className="font-semibold text-foreground">Nenhuma promoção ainda</p>
                <p className="text-sm text-muted-foreground mt-1">Crie sua primeira promoção para engajar seus revendedores</p>
              </div>
              <Button onClick={openCreate} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Criar primeira promoção
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {promos.map(p => {
              const status = promoStatus(p);
              return (
                <Card key={p.id} className="border-border/30 bg-card/60 overflow-hidden">
                  {/* Color bar */}
                  <div className="h-1 w-full" style={{ background: p.highlight_color }} />
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        {/* Icon */}
                        <div className="rounded-xl p-2.5 shrink-0" style={{ background: `${p.highlight_color}20` }}>
                          {p.type === 'vitalicia' ? <Zap className="h-5 w-5" style={{ color: p.highlight_color }} /> :
                           p.type === 'pacote' ? <Package className="h-5 w-5" style={{ color: p.highlight_color }} /> :
                           <Star className="h-5 w-5" style={{ color: p.highlight_color }} />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground font-display">{p.title}</h3>
                            <Badge variant="outline" className="text-[10px] px-2">
                              {TYPE_LABELS[p.type] || p.type}
                            </Badge>
                            <Badge className={
                              status === 'active' ? 'bg-green-500/15 text-green-400 border-green-500/20' :
                              status === 'expired' ? 'bg-red-500/15 text-red-400 border-red-500/20' :
                              status === 'scheduled' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' :
                              'bg-muted text-muted-foreground border-border'
                            } variant="outline">
                              {status === 'active' ? '● Ativa' :
                               status === 'expired' ? '● Expirada' :
                               status === 'scheduled' ? '● Agendada' : '● Desativada'}
                            </Badge>
                          </div>
                          {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                            <span className="font-semibold text-foreground text-base">
                              R$ {Number(p.price).toFixed(2).replace('.', ',')}
                              {p.quantity && <span className="text-sm font-normal text-muted-foreground ml-1">/ {p.quantity} chaves</span>}
                            </span>
                            {p.expires_at && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {isAfter(parseISO(p.expires_at), new Date())
                                  ? `Expira ${formatDistanceToNow(parseISO(p.expires_at), { addSuffix: true, locale: ptBR })}`
                                  : `Expirou ${format(parseISO(p.expires_at), "dd/MM 'às' HH:mm", { locale: ptBR })}`}
                              </span>
                            )}
                            {!p.expires_at && <span className="text-green-400/70">Sem expiração</span>}
                          </div>
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch checked={p.is_active} onCheckedChange={() => handleToggle(p)} />
                        <Button size="icon" variant="ghost" onClick={() => openEdit(p)} className="h-8 w-8">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm(p.id)} className="h-8 w-8 text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={!!dialog} onOpenChange={open => !open && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              {dialog === 'create' ? 'Nova Promoção' : 'Editar Promoção'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input placeholder="Ex: Chave Vitalícia em Promoção" value={form.title} onChange={e => patch('title', e.target.value)} />
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => patch('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vitalicia">⚡ Vitalícia</SelectItem>
                  <SelectItem value="pacote">📦 Pacote de Chaves</SelectItem>
                  <SelectItem value="custom">🎯 Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Price + Quantity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Preço (R$) *</Label>
                <Input type="number" min="0" step="0.01" placeholder="47.90" value={form.price} onChange={e => patch('price', e.target.value)} />
              </div>
              {form.type === 'pacote' && (
                <div className="space-y-1.5">
                  <Label>Qtd. de Chaves</Label>
                  <Input type="number" min="1" placeholder="10" value={form.quantity || ''} onChange={e => patch('quantity', e.target.value ? Number(e.target.value) : null)} />
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Textarea placeholder="Detalhes da promoção..." value={form.description || ''} onChange={e => patch('description', e.target.value)} rows={2} />
            </div>

            {/* Starts / Expires */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={e => patch('starts_at', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Expira em (opcional)</Label>
                <Input type="datetime-local" value={form.expires_at || ''} onChange={e => patch('expires_at', e.target.value || null)} />
              </div>
            </div>

            {/* Color */}
            <div className="space-y-1.5">
              <Label>Cor de destaque</Label>
              <div className="flex gap-2">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => patch('highlight_color', c.value)}
                    className={`h-7 w-7 rounded-full transition-all ${form.highlight_color === c.value ? 'ring-2 ring-offset-2 ring-offset-background scale-110' : 'opacity-60 hover:opacity-100'}`}
                    style={{ background: c.value, ringColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Active toggle */}
            <div className="flex items-center gap-3">
              <Switch id="is_active" checked={form.is_active} onCheckedChange={v => patch('is_active', v)} />
              <Label htmlFor="is_active">Ativar imediatamente</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient hover:opacity-90 gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {dialog === 'create' ? 'Criar Promoção' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={open => !open && setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Excluir promoção?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação é irreversível. A promoção será removida imediatamente para todos os revendedores.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
