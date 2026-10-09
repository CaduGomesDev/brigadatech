-- Schema inicial do BrigadaTech
-- Gerado a partir do que o código em src/ espera (não havia schema versionado no repo).

create extension if not exists "pgcrypto";

-- ============================================================================
-- Tabelas
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  cargo text not null default 'Gerente' check (cargo in ('Coordenador','Supervisor','Gerente')),
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_cargo_idx on public.profiles(cargo);

create table public.chamados_brigada (
  id uuid primary key default gen_random_uuid(),
  brigadista text not null,
  colaborador_atendido text not null,
  situacao text not null,
  pressao_arterial text,
  bpm text,
  temperatura text,
  saturacao text,
  dados_atendimento text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chamados_brigada_created_at_idx on public.chamados_brigada(created_at desc);
create index chamados_brigada_situacao_idx on public.chamados_brigada(situacao);

create table public.extintores (
  id uuid primary key default gen_random_uuid(),
  numero text not null unique,
  localizacao text not null,
  tipo text not null,
  capacidade text not null,
  suporte_altura text not null check (suporte_altura in ('Conforme','Não Conforme','Não Aplicável')),
  selo_inmetro text not null check (selo_inmetro in ('Conforme','Não Conforme','Não Aplicável')),
  lacre_pino text not null check (lacre_pino in ('Conforme','Não Conforme','Não Aplicável')),
  manometro text not null check (manometro in ('Conforme','Não Conforme','Não Aplicável')),
  corpo_extintor text not null check (corpo_extintor in ('Conforme','Não Conforme','Não Aplicável')),
  mangueira_bico text not null check (mangueira_bico in ('Conforme','Não Conforme','Não Aplicável')),
  valvula_bico text not null check (valvula_bico in ('Conforme','Não Conforme','Não Aplicável')),
  valvula_gatilho text not null check (valvula_gatilho in ('Conforme','Não Conforme','Não Aplicável')),
  validade date not null,
  ultima_inspecao date not null,
  situacao text not null check (situacao in ('Conforme','Não Conforme','Em Manutenção','Vencido')),
  observacoes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index extintores_situacao_idx on public.extintores(situacao);

create table public.historico_extintores (
  id uuid primary key default gen_random_uuid(),
  extintor_id uuid references public.extintores(id) on delete set null,
  extintor_numero text not null,
  acao text not null check (acao in ('Cadastro','Alteração','Alteração de status','Exclusão')),
  usuario_id uuid references auth.users(id) on delete set null,
  usuario_nome text,
  detalhes jsonb,
  created_at timestamptz not null default now()
);

create index historico_extintores_created_at_idx on public.historico_extintores(created_at desc);
create index historico_extintores_extintor_id_idx on public.historico_extintores(extintor_id);

create table public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  mensagem text not null,
  fixada boolean not null default false,
  autor_id uuid references auth.users(id) on delete set null,
  autor_nome text not null,
  cargo_autor text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notificacoes_fixada_idx on public.notificacoes(fixada, created_at desc);

create table public.notificacoes_lidas (
  id uuid primary key default gen_random_uuid(),
  notificacao_id uuid not null references public.notificacoes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (notificacao_id, user_id)
);

create table public.aceites_termos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  versao_termos text not null,
  created_at timestamptz not null default now(),
  unique (user_id, versao_termos)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  acao text not null,
  detalhes jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_user_id_idx on public.audit_logs(user_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);

-- ============================================================================
-- Funções auxiliares
-- ============================================================================

-- Lê o cargo do usuário atual. SECURITY DEFINER evita recursão de RLS quando
-- usada dentro de policies de outras tabelas.
create or replace function public.current_cargo()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select cargo from public.profiles where id = auth.uid()
$$;

-- Cria o profile automaticamente quando um novo usuário é criado no Auth.
-- Espelha o fallback client-side em src/contexts/AuthContext.tsx.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome, email, cargo, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    new.email,
    'Gerente',
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Registra automaticamente o histórico de alterações de extintores
-- (nenhum insert client-side existe para historico_extintores; é só leitura).
create or replace function public.log_historico_extintor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_acao text;
  v_nome text;
begin
  select nome into v_nome from public.profiles where id = auth.uid();

  if tg_op = 'INSERT' then
    insert into public.historico_extintores (extintor_id, extintor_numero, acao, usuario_id, usuario_nome, detalhes)
    values (new.id, new.numero, 'Cadastro', auth.uid(), v_nome, null);
    return new;
  elsif tg_op = 'UPDATE' then
    v_acao := case when old.situacao is distinct from new.situacao then 'Alteração de status' else 'Alteração' end;
    insert into public.historico_extintores (extintor_id, extintor_numero, acao, usuario_id, usuario_nome, detalhes)
    values (new.id, new.numero, v_acao, auth.uid(), v_nome,
      jsonb_build_object('situacao_anterior', old.situacao, 'situacao_nova', new.situacao));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.historico_extintores (extintor_id, extintor_numero, acao, usuario_id, usuario_nome, detalhes)
    values (null, old.numero, 'Exclusão', auth.uid(), v_nome, null);
    return old;
  end if;
  return null;
end;
$$;

create trigger extintores_historico_trigger
  after insert or update or delete on public.extintores
  for each row execute function public.log_historico_extintor();

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger chamados_touch_updated_at before update on public.chamados_brigada
  for each row execute function public.touch_updated_at();
create trigger extintores_touch_updated_at before update on public.extintores
  for each row execute function public.touch_updated_at();
create trigger notificacoes_touch_updated_at before update on public.notificacoes
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.chamados_brigada enable row level security;
alter table public.extintores enable row level security;
alter table public.historico_extintores enable row level security;
alter table public.notificacoes enable row level security;
alter table public.notificacoes_lidas enable row level security;
alter table public.aceites_termos enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: leitura liberada (nomes aparecem em listagens/notificações);
-- escrita restrita à própria linha, e só na coluna "nome" (cargo só muda
-- via Edge Function update-user-cargo, que usa service_role).
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (nome) on public.profiles to authenticated;

-- chamados_brigada: qualquer autenticado cria; só Coordenador edita/exclui
-- (hasCargoPermission(cargo, 'Coordenador') em HistoricoChamados.tsx).
create policy "chamados_select_authenticated" on public.chamados_brigada
  for select to authenticated using (true);
create policy "chamados_insert_authenticated" on public.chamados_brigada
  for insert to authenticated with check (created_by = auth.uid());
create policy "chamados_update_coordenador" on public.chamados_brigada
  for update to authenticated using (public.current_cargo() = 'Coordenador') with check (public.current_cargo() = 'Coordenador');
create policy "chamados_delete_coordenador" on public.chamados_brigada
  for delete to authenticated using (public.current_cargo() = 'Coordenador');

-- extintores: leitura geral; escrita só Coordenador (ControleExtintores.tsx).
create policy "extintores_select_authenticated" on public.extintores
  for select to authenticated using (true);
create policy "extintores_insert_coordenador" on public.extintores
  for insert to authenticated with check (public.current_cargo() = 'Coordenador');
create policy "extintores_update_coordenador" on public.extintores
  for update to authenticated using (public.current_cargo() = 'Coordenador') with check (public.current_cargo() = 'Coordenador');
create policy "extintores_delete_coordenador" on public.extintores
  for delete to authenticated using (public.current_cargo() = 'Coordenador');

-- historico_extintores: só leitura pelo client; escrita apenas pelo trigger
-- (SECURITY DEFINER, roda como owner da tabela e ignora RLS).
create policy "historico_extintores_select_authenticated" on public.historico_extintores
  for select to authenticated using (true);

-- notificacoes: leitura geral; escrita Coordenador/Supervisor
-- (hasCargoPermission(cargo, 'Supervisor') em Notificacoes.tsx).
create policy "notificacoes_select_authenticated" on public.notificacoes
  for select to authenticated using (true);
create policy "notificacoes_insert_supervisor" on public.notificacoes
  for insert to authenticated with check (
    public.current_cargo() in ('Coordenador','Supervisor') and autor_id = auth.uid()
  );
create policy "notificacoes_update_supervisor" on public.notificacoes
  for update to authenticated using (public.current_cargo() in ('Coordenador','Supervisor'))
  with check (public.current_cargo() in ('Coordenador','Supervisor'));
create policy "notificacoes_delete_supervisor" on public.notificacoes
  for delete to authenticated using (public.current_cargo() in ('Coordenador','Supervisor'));

-- notificacoes_lidas: cada usuário só vê/marca as próprias leituras.
create policy "notificacoes_lidas_select_own" on public.notificacoes_lidas
  for select to authenticated using (user_id = auth.uid());
create policy "notificacoes_lidas_insert_own" on public.notificacoes_lidas
  for insert to authenticated with check (user_id = auth.uid());
create policy "notificacoes_lidas_update_own" on public.notificacoes_lidas
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- aceites_termos: cada usuário só vê/insere os próprios aceites (LGPD).
create policy "aceites_termos_select_own" on public.aceites_termos
  for select to authenticated using (user_id = auth.uid());
create policy "aceites_termos_insert_own" on public.aceites_termos
  for insert to authenticated with check (user_id = auth.uid());

-- audit_logs: qualquer autenticado grava seu próprio evento;
-- só Coordenador consulta o log.
create policy "audit_logs_insert_own" on public.audit_logs
  for insert to authenticated with check (user_id = auth.uid());
create policy "audit_logs_select_coordenador" on public.audit_logs
  for select to authenticated using (public.current_cargo() = 'Coordenador');
