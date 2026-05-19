import { useEffect, useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Activity, TrendingDown, Zap, Clock } from 'lucide-react';

interface MetricRow {
  id: string;
  created_at: string;
  provider: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  duration_ms: number;
  function_name: string;
}

interface DailyData {
  date: string;
  input: number;
  output: number;
  total: number;
  calls: number;
}

interface ProviderData {
  name: string;
  tokens: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function TokenMetrics() {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [providerData, setProviderData] = useState<ProviderData[]>([]);
  const [functionData, setFunctionData] = useState<{ name: string; tokens: number; calls: number }[]>([]);
  const [totals, setTotals] = useState({ input: 0, output: 0, total: 0, calls: 0, avgDuration: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  async function fetchMetrics() {
    setLoading(true);
    const { data, error } = await supabase
      .from('token_metrics' as any)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error || !data) {
      setLoading(false);
      return;
    }

    const rows = data as unknown as MetricRow[];

    // Totals
    let totalInput = 0, totalOutput = 0, totalAll = 0, totalDuration = 0;
    for (const r of rows) {
      totalInput += r.input_tokens;
      totalOutput += r.output_tokens;
      totalAll += r.total_tokens;
      totalDuration += r.duration_ms;
    }
    setTotals({
      input: totalInput,
      output: totalOutput,
      total: totalAll,
      calls: rows.length,
      avgDuration: rows.length ? Math.round(totalDuration / rows.length) : 0,
    });

    // Daily aggregation
    const byDay: Record<string, DailyData> = {};
    for (const r of rows) {
      const day = r.created_at.substring(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, input: 0, output: 0, total: 0, calls: 0 };
      byDay[day].input += r.input_tokens;
      byDay[day].output += r.output_tokens;
      byDay[day].total += r.total_tokens;
      byDay[day].calls += 1;
    }
    setDailyData(Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)).slice(-14));

    // By provider
    const byProvider: Record<string, number> = {};
    for (const r of rows) {
      byProvider[r.provider] = (byProvider[r.provider] || 0) + r.total_tokens;
    }
    setProviderData(Object.entries(byProvider).map(([name, tokens]) => ({ name, tokens })).sort((a, b) => b.tokens - a.tokens));

    // By function
    const byFunc: Record<string, { tokens: number; calls: number }> = {};
    for (const r of rows) {
      if (!byFunc[r.function_name]) byFunc[r.function_name] = { tokens: 0, calls: 0 };
      byFunc[r.function_name].tokens += r.total_tokens;
      byFunc[r.function_name].calls += 1;
    }
    setFunctionData(Object.entries(byFunc).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.tokens - a.tokens));

    setLoading(false);
  }

  function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <AdminLayout>
      <div className="space-y-6 px-1 sm:px-0 pt-12 lg:pt-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Métricas de Tokens</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitoramento de consumo de tokens por chamada de IA</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-card/80 backdrop-blur border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Tokens</p>
                  <p className="text-xl font-bold">{formatTokens(totals.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Output Tokens</p>
                  <p className="text-xl font-bold">{formatTokens(totals.output)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/20">
                  <Activity className="h-4 w-4 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Chamadas</p>
                  <p className="text-xl font-bold">{totals.calls}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur border-border/50">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-yellow-500/10">
                  <Clock className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tempo Médio</p>
                  <p className="text-xl font-bold">{(totals.avgDuration / 1000).toFixed(1)}s</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Daily chart */}
        <Card className="bg-card/80 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Consumo Diário de Tokens (últimos 14 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Carregando...</div>
            ) : dailyData.length === 0 ? (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">Nenhum dado registrado ainda</div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => v.substring(5)} />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" tickFormatter={formatTokens} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(value: number, name: string) => [formatTokens(value), name === 'input' ? 'Input' : 'Output']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Bar dataKey="input" stackId="a" fill="hsl(var(--primary))" name="Input" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="output" stackId="a" fill="#22c55e" name="Output" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Provider + Function breakdown */}
        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="bg-card/80 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Por Provedor</CardTitle>
            </CardHeader>
            <CardContent>
              {providerData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={providerData} dataKey="tokens" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                      {providerData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatTokens(value)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Por Função</CardTitle>
            </CardHeader>
            <CardContent>
              {functionData.length === 0 ? (
                <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
              ) : (
                <div className="space-y-3">
                  {functionData.map((f) => (
                    <div key={f.name} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
                      <div>
                        <p className="text-sm font-medium">{f.name}</p>
                        <p className="text-xs text-muted-foreground">{f.calls} chamadas</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatTokens(f.tokens)}</p>
                        <p className="text-xs text-muted-foreground">tokens</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
