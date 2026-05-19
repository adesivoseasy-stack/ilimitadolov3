import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, RefreshCw, DollarSign, Plus, Trash2 } from 'lucide-react';
import { PlanType } from '@/hooks/useResellerPricing';

interface TierRow {
  qty: string;
  price: string;
}

const PLAN_LABELS: Record<string, string> = {
  '197': 'Plano R$ 197',
  '297': 'Plano R$ 297',
};

const DEFAULT_TIERS: Record<string, TierRow[]> = {
  '197': [
    { qty: '1', price: '49.90' },
    { qty: '2', price: '49.90' },
    { qty: '3', price: '49.90' },
  ],
  '297': [
    { qty: '1', price: '29.90' },
    { qty: '2', price: '29.90' },
    { qty: '3', price: '29.90' },
  ],
};

export function ResellerPricingSettings() {
  const [activePlan, setActivePlan] = useState<string>('197');
  const [tiers, setTiers] = useState<Record<string, TierRow[]>>({ '197': [], '297': [] });
  const [originalTiers, setOriginalTiers] = useState<Record<string, TierRow[]>>({ '197': [], '297': [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchPricing = async () => {
    setLoading(true);
    const allTiers: Record<string, TierRow[]> = { '197': [], '297': [] };

    for (const plan of ['197', '297']) {
      const prefix = `reseller_key_tier_${plan}_`;
      const { data, error } = await supabase
        .from('system_config')
        .select('key, value')
        .like('key', `${prefix}%`);

      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
        continue;
      }

      const configMap = new Map((data || []).map(c => [c.key, c.value]));
      const loaded: TierRow[] = [];

      for (let i = 1; i <= 10; i++) {
        const qty = configMap.get(`${prefix}${i}_qty`);
        const price = configMap.get(`${prefix}${i}_price`);
        if (qty && price) {
          loaded.push({ qty, price });
        }
      }

      allTiers[plan] = loaded.length > 0 ? loaded : [...DEFAULT_TIERS[plan]];
    }

    setTiers(allTiers);
    setOriginalTiers(JSON.parse(JSON.stringify(allTiers)));
    setLoading(false);
  };

  useEffect(() => { fetchPricing(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const plan of ['197', '297']) {
        const prefix = `reseller_key_tier_${plan}_`;
        
        await supabase
          .from('system_config')
          .delete()
          .like('key', `${prefix}%`);

        const inserts = tiers[plan].flatMap((tier, i) => [
          { key: `${prefix}${i + 1}_qty`, value: tier.qty, description: `Plano ${plan} - Tier ${i + 1} quantidade` },
          { key: `${prefix}${i + 1}_price`, value: tier.price, description: `Plano ${plan} - Tier ${i + 1} preço por chave` },
        ]);

        if (inserts.length > 0) {
          const { error } = await supabase.from('system_config').insert(inserts);
          if (error) throw error;
        }
      }

      toast({ title: 'Preços atualizados', description: 'As faixas de preço foram salvas com sucesso.' });
      setOriginalTiers(JSON.parse(JSON.stringify(tiers)));
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const addTier = (plan: string) => {
    setTiers(prev => ({ ...prev, [plan]: [...prev[plan], { qty: '', price: '' }] }));
  };

  const removeTier = (plan: string, index: number) => {
    setTiers(prev => ({ ...prev, [plan]: prev[plan].filter((_, i) => i !== index) }));
  };

  const updateTier = (plan: string, index: number, field: keyof TierRow, value: string) => {
    setTiers(prev => ({
      ...prev,
      [plan]: prev[plan].map((t, i) => i === index ? { ...t, [field]: value } : t),
    }));
  };

  const hasChanges = JSON.stringify(tiers) !== JSON.stringify(originalTiers);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader><div className="h-6 bg-muted rounded w-1/3" /></CardHeader>
        <CardContent><div className="h-40 bg-muted rounded" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Faixas de Preço por Plano</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchPricing} disabled={loading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !hasChanges}>
              {saving ? <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
              Salvar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground mb-4">
          Configure as faixas de preço por quantidade de chaves para cada plano. O plano R$ 997 é ilimitado e não requer configuração.
        </p>
        <Tabs value={activePlan} onValueChange={setActivePlan}>
          <TabsList className="mb-4">
            <TabsTrigger value="197">Plano R$ 197</TabsTrigger>
            <TabsTrigger value="297">Plano R$ 297</TabsTrigger>
          </TabsList>
          {['197', '297'].map(plan => (
            <TabsContent key={plan} value={plan}>
              <div className="space-y-3">
                {tiers[plan].map((tier, index) => (
                  <div key={index} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Quantidade de chaves</Label>
                      <Input
                        type="number"
                        min="1"
                        value={tier.qty}
                        onChange={(e) => updateTier(plan, index, 'qty', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Ex: 1"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Preço por chave (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={tier.price}
                        onChange={(e) => updateTier(plan, index, 'price', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Ex: 30.00"
                      />
                    </div>
                    <div className="pt-5">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Total: R$ {((parseFloat(tier.qty) || 0) * (parseFloat(tier.price) || 0)).toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-5">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeTier(plan, index)} disabled={tiers[plan].length <= 1}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => addTier(plan)}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Adicionar faixa
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
