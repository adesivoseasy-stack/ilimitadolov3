import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Zap, Package, Star, Clock, Tag } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  type: string;
  price: number;
  quantity: number | null;
  expires_at: string | null;
  highlight_color: string;
}

export function PromocoesWidget() {
  const [promos, setPromos] = useState<Promotion[]>([]);

  useEffect(() => {
    (supabase as any)
      .from('promotions')
      .select('id,title,description,type,price,quantity,expires_at,highlight_color')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: Promotion[] | null }) => {
        const now = new Date();
        const active = (data || []).filter(p =>
          !p.expires_at || new Date(p.expires_at) > now
        );
        setPromos(active);
      });
  }, []);

  if (promos.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <Tag className="h-3.5 w-3.5 text-primary" />
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Promoções</span>
      </div>
      {promos.map(p => (
        <div
          key={p.id}
          className="rounded-xl border overflow-hidden bg-card/60"
          style={{ borderColor: `${p.highlight_color}30` }}
        >
          {/* Colored top bar */}
          <div className="h-[3px]" style={{ background: p.highlight_color }} />
          <div className="p-3 space-y-1">
            <div className="flex items-center gap-2">
              <div className="rounded-lg p-1.5" style={{ background: `${p.highlight_color}20` }}>
                {p.type === 'vitalicia' ? <Zap className="h-3.5 w-3.5" style={{ color: p.highlight_color }} /> :
                 p.type === 'pacote' ? <Package className="h-3.5 w-3.5" style={{ color: p.highlight_color }} /> :
                 <Star className="h-3.5 w-3.5" style={{ color: p.highlight_color }} />}
              </div>
              <span className="text-[13px] font-semibold text-foreground leading-tight">{p.title}</span>
            </div>
            {p.description && (
              <p className="text-[11px] text-muted-foreground pl-8 leading-relaxed">{p.description}</p>
            )}
            <div className="flex items-center justify-between pl-8 pt-0.5">
              <span className="text-base font-bold" style={{ color: p.highlight_color }}>
                R$ {Number(p.price).toFixed(2).replace('.', ',')}
                {p.quantity && <span className="text-xs font-normal text-muted-foreground ml-1">/{p.quantity} chaves</span>}
              </span>
              {p.expires_at && (
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDistanceToNow(parseISO(p.expires_at), { addSuffix: true, locale: ptBR })}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
