# Desconto Progressivo da Comunidade (por revendedor)

Sistema de gamificação com barra de progresso que aumenta desconto automaticamente à medida que cada revendedor acumula vendas pagas.

## Regras confirmadas
- **Contador por revendedor** (cada um tem sua barra e nível).
- **Toda venda PIX paga** conta (qualquer produto: chaves, combos, Gemini, CapCut, Manus, Seedance). Incremento = `quantity` do pedido.
- **Desconto aplica em todos os produtos** da loja (chave mensal + todos os produtos externos).
- **Backfill inicial**: contador começa contando todos os `credit_orders` com `status='paid'` já existentes.
- Níveis padrão: Bronze 10→3%, Prata 20→5%, Ouro 35→8%, Platina 50→12%, Diamante 75→15%.

## Backend

### Migração
1. Tabela `community_discount_levels` (compartilhada, editável por admin):
   - `name`, `sales_required`, `discount_percentage`, `order_index`, `emoji`
   - Seed com os 5 níveis.
2. Tabela `reseller_community_progress` (uma linha por revendedor):
   - `reseller_id` (PK, FK auth.users), `current_sales`, `current_level_id`, `current_discount`, `next_level_id`, `sales_to_next`, timestamps.
3. Tabela `community_discount_config` (linha singleton):
   - `is_active`, `applies_to_products` (jsonb com whitelist de product keys, default = todos).
4. RLS:
   - `community_discount_levels` / `community_discount_config`: SELECT para authenticated; ALL para admin/manager.
   - `reseller_community_progress`: SELECT/UPDATE só do próprio (`auth.uid() = reseller_id`), ALL para admin/manager.
   - GRANTs padrão em todas as tabelas novas.
5. Função `recalc_reseller_progress(_reseller_id uuid)` (SECURITY DEFINER): soma `quantity` de `credit_orders` pagos daquele reseller, resolve o nível atual + próximo, faz UPSERT em `reseller_community_progress`.
6. Trigger `AFTER UPDATE ON credit_orders` quando `status` muda para `'paid'`: chama `recalc_reseller_progress(NEW.reseller_id)`.
7. Habilitar Realtime na tabela `reseller_community_progress` (via `ALTER PUBLICATION supabase_realtime ADD TABLE`).
8. Backfill: rodar `recalc_reseller_progress` para cada `reseller_id` distinto em `credit_orders WHERE status='paid'`.

### Edge functions
- **`create-pix-order`**: aceita novo campo opcional `communityDiscountApplied` no body só para registro; o preço final continua vindo do servidor. Server lê `reseller_community_progress` do usuário autenticado e aplica `preçoFinal = round(preçoOriginal * (1 - discount/100), 2)` em todos os `amount_cents` calculados hoje. Guardar `discount_snapshot` (level + %) em `credit_orders.metadata` para auditoria.
- Nenhum outro edge function precisa mudar (o trigger cuida da progressão quando o webhook marca `status='paid'`).

## Frontend

### Hook `useCommunityDiscount()`
- Query React Query: busca `reseller_community_progress` do usuário + `community_discount_levels` + config.
- Assina realtime em `reseller_community_progress` filtrando pelo próprio `reseller_id`; ao receber evento, invalida query e dispara animação de "level up" se `current_level_id` mudou.
- Expõe: `currentSales`, `currentLevel`, `nextLevel`, `salesToNext`, `discountPct`, `applyDiscount(price)` helper, `isActive`.

### Componente `<CommunityDiscountBanner />`
- Card acima do grid de produtos em `ResellerDashboard.tsx` (aba `loja`).
- Layout: glass-card com borda gradiente roxo, badges dos 5 níveis distribuídos horizontalmente sobre a trilha, barra neon (Framer Motion `motion.div` com `layout` + `spring`), contador animado do número de vendas, badge do nível atual, próximo nível + "faltam X vendas".
- Mensagens dinâmicas:
  - Padrão: "Faltam apenas {X} vendas para desbloquear {N}% OFF."
  - Se `X === 1`: "🚨 Falta apenas UMA venda para desbloquear o próximo desconto!".
  - Se nível máximo: "🏆 Nível máximo atingido — {N}% OFF em toda a loja".
- Ao subir de nível: confete (`canvas-confetti`), pulse no badge, glow neon.
- Totalmente responsivo (empilha em mobile: barra full-width, badges viram legenda abaixo).

### Aplicação de desconto nos cards de produto
- Em `ResellerDashboard.tsx` (chaves + todos os produtos externos) e no cálculo do PIX:
  - Se `isActive && discountPct > 0`: mostrar preço original riscado + novo preço + badge "🔥 -{X}%".
  - Formula: `finalPrice = Math.round(originalPrice * (1 - pct/100) * 100) / 100`.
- Continuar respeitando promoções fixas (usa o menor entre promo e desconto comunidade).

### Página admin `/admin/desconto-progressivo`
- Nova rota + item no `Sidebar.tsx` (admin/manager).
- Seções:
  - Tabela editável de níveis (nome, emoji, vendas necessárias, %, ordem, adicionar/remover linha).
  - Toggle "Campanha ativa" (`is_active`).
  - Whitelist de produtos participantes (checkbox por product key).
  - Lista de revendedores com progresso atual + botão "editar vendas manualmente" + "resetar campanha deste revendedor".
  - Botão "Resetar campanha para todos" (zera todos os `current_sales`; útil para relançar).

## Detalhes técnicos

- Stack: React Query + Supabase Realtime + Framer Motion + `canvas-confetti` (adicionar dependência).
- Todos os cálculos de preço final também são feitos no servidor (`create-pix-order`) — o cliente nunca decide o valor pago.
- O trigger é AFTER UPDATE para pegar transição `pending → paid` do webhook SyncPay/Hoopay atual (que já dá UPDATE em `credit_orders`).
- `reseller_community_progress.current_sales` é sempre recalculado a partir de `credit_orders` (fonte da verdade), evitando drift.
- RLS estrita: revendedor só lê o próprio progresso; níveis/config são lidos por todos os autenticados.
- Idioma: pt-BR em toda a UI, seguindo identidade glass roxa.

## Ordem de implementação
1. Migração (tabelas + RLS + função + trigger + realtime + backfill).
2. Hook `useCommunityDiscount` + `CommunityDiscountBanner`.
3. Integração de preços nos cards da loja + no `create-pix-order`.
4. Página admin.
5. Sidebar admin + rota.
