-- ─── LOV3 Boost — cota e telemetria ─────────────────────────────────────────
-- Criado em 2026-08-30
-- Tabela de cota: 10 usos por janela de 24h rolante por licenseId
-- Acesso apenas via service_role (sem RLS policy para authenticated)

create table if not exists public.boost_cota (
  license_id    text        primary key,
  usos          int         not null default 0,
  janela_inicio timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.boost_cota enable row level security;
-- Sem policy para authenticated: acesso só via service_role key (Edge Function)

-- ─── Telemetria ───────────────────────────────────────────────────────────────
-- Registra cada tentativa de Boost para monitorar taxa de sucesso e abuso.
-- eventos: 'boost_usado' | 'boost_estornado' | 'boost_indisponivel'

create table if not exists public.boost_telemetria (
  id                  uuid        primary key default gen_random_uuid(),
  license_id          text        not null,
  evento              text        not null,
  status_report_error int,
  status_chat         int,
  estornado           boolean     not null default false,
  criado_em           timestamptz not null default now()
);

alter table public.boost_telemetria enable row level security;
-- Sem policy para authenticated: acesso só via service_role key

-- Indice para consultar telemetria por licenca
create index if not exists boost_telemetria_license_idx on public.boost_telemetria(license_id, criado_em desc);