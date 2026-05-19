

## Nova página pública `/creditos` para revenda de Créditos Lovable

Criar uma rota pública standalone (`/creditos`) com layout inspirado na segunda imagem (Painel de Revenda), reutilizando 100% da lógica de PIX/SyncPay e provisionamento LVB já existente. Adicionar autenticação dedicada (login + cadastro próprio) na mesma página, e um painel admin de configuração de preços específico desta nova aba.

### O que será construído

**1. Rota pública `/creditos` (uma única página, dois estados)**

- **Estado deslogado**: tela split-screen (estilo `ResellerRegister.tsx`) com tabs "Entrar" e "Cadastrar":
  - **Entrar**: email + senha → `supabase.auth.signInWithPassword` (mesma credencial do painel principal). Inclui botão "Continuar com Google" via `lovable.auth.signInWithOAuth`.
  - **Cadastrar**: nome + email + senha + telefone (opcional) → cria usuário Supabase + insere em nova tabela `credits_customers` (status `approved` automático, **diferente** de `reseller_profiles` que exige aprovação manual).
  - Após login/cadastro bem-sucedido, atualiza estado para "logado".

- **Estado logado**: layout exatamente como image-150:
  - Header: logo "Painel de Revenda", saldo (placeholder `R$ 0,00`), botões "Pedidos", "Lojinha" (visual apenas), "Avisos", logout.
  - Saudação: "Olá, {nome}!" + "Gerencie seus pedidos de créditos Lovable".
  - Tabs internas: **Novo Pedido** | **Histórico**.
  - **Novo Pedido (esquerda)**: chips de quantidade rápida (100/200/300/500/1000/2000/3000/5000), input numérico com −/+ , campo "Identificador do Pedido (opcional)", método de pagamento "PIX Direto" (apenas, "Saldo" desabilitado/oculto na v1), total dinâmico, botão "Criar Pedido".
  - **Tabela de Preços (direita)**: lista vertical de todos os pacotes com preço atual (busca de `system_config` com prefixo novo `creditos_pkg_*`).
  - **Histórico**: tabela dos próprios pedidos (`lvb_credit_orders` filtrado por `reseller_id = user.id`).

**2. Fluxo de pagamento (reutiliza tudo)**

- Ao clicar "Criar Pedido": abre `PixCustomerDialog` (mesmo já existente) → chama `create-lvb-pix` (reutilizada, sem mudanças) → mostra QR/copy-paste em modal → poll a cada 5s em `lvb_credit_orders` até `status = 'configurando'` → exibe mesmo wizard de `LvbCreditsTab` (criado/promote/tracking) ou versão simplificada.
- O `syncpay-webhook` já trata `lvb_credit_orders` corretamente — nenhuma mudança necessária no backend de pagamento.

**3. Roles e segurança**

- Nova role `credits_customer` adicionada ao enum `app_role`.
- Novos cadastros via `/creditos` recebem essa role (não `reseller`), via trigger ou insert direto no signup.
- A edge function `create-lvb-pix` já aceita roles `['reseller', 'apollo', 'admin', 'manager']` — adicionar `'credits_customer'` na whitelist.
- `lvb-credits` (mesmo update na whitelist).
- RLS na nova tabela `credits_customers`: cada usuário só vê seu próprio perfil; admin vê todos.

**4. Painel admin: nova rota `/admin/creditos-config`**

- Adicionar item "Config Créditos" no `Sidebar.tsx` admin (ícone `Coins` ou `Settings2`).
- Página com:
  - Tabela editável de pacotes (mesmo padrão de `LvbCreditsAdmin.tsx` aba "Preços"), mas usando chave `creditos_pkg_{N}` em `system_config` — **separada** dos preços de `lvb_package_*` para que admin possa cobrar diferente nos dois canais.
  - Lista de clientes cadastrados em `/creditos` (`credits_customers`) com email, nome, data, total de pedidos.
  - Tabela resumida dos últimos pedidos vindos da rota `/creditos` (filtrar por `lvb_credit_orders.source = 'creditos_page'`).

**5. Mudanças de banco (migrations)**

```sql
-- 1. Adicionar role
ALTER TYPE app_role ADD VALUE 'credits_customer';

-- 2. Tabela de perfis dos clientes da página /creditos
CREATE TABLE credits_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name text NOT NULL,
  phone text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE credits_customers ENABLE ROW LEVEL SECURITY;
-- policies: self read/insert/update + admin all

-- 3. Coluna source para distinguir origem
ALTER TABLE lvb_credit_orders 
  ADD COLUMN source text DEFAULT 'reseller_panel';
-- valores: 'reseller_panel' | 'creditos_page'
```

- `create-lvb-pix` aceitará `source` opcional no body para gravar na coluna; usará `creditos_pkg_{N}` como override de preço quando `source = 'creditos_page'`.

### Detalhes técnicos

**Arquivos a criar:**
- `src/pages/CreditosPage.tsx` — rota principal (estados deslogado/logado).
- `src/components/creditos/CreditosLogin.tsx` — formulário login + cadastro (split-screen).
- `src/components/creditos/CreditosPanel.tsx` — painel logado (Novo Pedido + Tabela + Histórico).
- `src/pages/admin/CreditosConfig.tsx` — admin para preços + clientes da página.
- `src/hooks/useCreditosCustomer.ts` — busca/cria perfil em `credits_customers`.

**Arquivos a editar:**
- `src/App.tsx` — adicionar rotas `/creditos` (pública) e `/admin/creditos-config` (admin).
- `src/components/admin/Sidebar.tsx` — novo item "Config Créditos".
- `supabase/functions/create-lvb-pix/index.ts` — whitelist `credits_customer`, suportar `source`, ler `creditos_pkg_*` quando `source='creditos_page'`.
- `supabase/functions/lvb-credits/index.ts` — whitelist `credits_customer` para `confirm-invite`/`get-action`/`get-order` (read-only do próprio pedido).

**Reuso garantido:**
- `PixCustomerDialog`, `PixQrCode`, `useLvbCredits`, `syncpay-webhook`, lógica de polling/wizard de `LvbCreditsTab.tsx`.

**Estética:** mesma paleta roxa/glassmorphism do projeto (`identidade-visual` memory). Cards `rounded-2xl`, gradientes `from-primary to-accent`, badges "MAIS PEDIDO" no pacote 1000.

**Separação de preços:** `lvb_package_*` (revendedores no painel) vs `creditos_pkg_*` (clientes finais via `/creditos`). Admin define os dois separadamente.

### Itens explicitamente fora do escopo

- "Saldo" como método de pagamento (apenas PIX Direto na v1 — implementar saldo exigiria nova tabela `customer_balance` + crédito/débito).
- Sistema de planos/qualificação (Pro/Diamante/Ouro) visível na image-150 — apenas visual estático na v1, sem regra de negócio.
- "Lojinha", "Afiliados", "API" — botões visuais sem destino na v1.

