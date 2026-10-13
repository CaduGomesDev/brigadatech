-- ============================================================================
-- Materiais e Equipamentos da Brigada
-- ============================================================================

create table public.materiais_brigada (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null,
  tipo_item text not null check (tipo_item in ('Consumível','Equipamento')),
  descricao text,
  lote text,
  quantidade_atual numeric not null default 0,
  unidade_medida text not null default 'un',
  estoque_minimo numeric not null default 0,
  local_armazenamento text not null,
  responsavel text not null,
  observacoes text,
  data_fabricacao date,
  data_validade date,
  numero_patrimonio text,
  estado_conservacao text check (estado_conservacao in ('Bom','Regular','Ruim')),
  data_ultima_inspecao date,
  data_proxima_manutencao date,
  alerta_vencimento_enviado boolean not null default false,
  alerta_manutencao_enviado boolean not null default false,
  alerta_estoque_enviado boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index materiais_brigada_categoria_idx on public.materiais_brigada(categoria);
create index materiais_brigada_validade_idx on public.materiais_brigada(data_validade);
create index materiais_brigada_manutencao_idx on public.materiais_brigada(data_proxima_manutencao);

create table public.historico_materiais_brigada (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references public.materiais_brigada(id) on delete set null,
  material_nome text not null,
  acao text not null check (acao in ('Cadastro','Alteração','Entrada de Estoque','Saída de Estoque','Exclusão')),
  usuario_id uuid references auth.users(id) on delete set null,
  usuario_nome text,
  detalhes jsonb,
  created_at timestamptz not null default now()
);
create index historico_materiais_created_at_idx on public.historico_materiais_brigada(created_at desc);
create index historico_materiais_material_id_idx on public.historico_materiais_brigada(material_id);

create table public.materiais_brigada_anexos (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.materiais_brigada(id) on delete cascade,
  nome_arquivo text not null,
  tipo text not null check (tipo in ('Foto','Nota Fiscal','Certificado','Laudo de Inspeção','Outro')),
  caminho text not null,
  tamanho_bytes bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index materiais_anexos_material_id_idx on public.materiais_brigada_anexos(material_id);

-- Configurações globais do sistema, chave/valor (ex.: dias de antecedência de alertas).
create table public.configuracoes_sistema (
  chave text primary key,
  valor jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.configuracoes_sistema (chave, valor)
values ('dias_antecedencia_alertas', '30'::jsonb)
on conflict (chave) do nothing;

-- ── Triggers ──────────────────────────────────────────────────────────────────

create or replace function public.log_historico_material()
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
    insert into public.historico_materiais_brigada (material_id, material_nome, acao, usuario_id, usuario_nome, detalhes)
    values (new.id, new.nome, 'Cadastro', auth.uid(), v_nome, jsonb_build_object('quantidade', new.quantidade_atual));
    return new;
  elsif tg_op = 'UPDATE' then
    v_acao := case
      when new.quantidade_atual > old.quantidade_atual then 'Entrada de Estoque'
      when new.quantidade_atual < old.quantidade_atual then 'Saída de Estoque'
      else 'Alteração'
    end;
    insert into public.historico_materiais_brigada (material_id, material_nome, acao, usuario_id, usuario_nome, detalhes)
    values (new.id, new.nome, v_acao, auth.uid(), v_nome,
      jsonb_build_object('quantidade_anterior', old.quantidade_atual, 'quantidade_nova', new.quantidade_atual));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.historico_materiais_brigada (material_id, material_nome, acao, usuario_id, usuario_nome, detalhes)
    values (null, old.nome, 'Exclusão', auth.uid(), v_nome, null);
    return old;
  end if;
  return null;
end;
$$;

create trigger materiais_brigada_historico_trigger
  after insert or update or delete on public.materiais_brigada
  for each row execute function public.log_historico_material();

create or replace function public.reset_alertas_material()
returns trigger
language plpgsql
as $$
begin
  if new.data_validade is distinct from old.data_validade then
    new.alerta_vencimento_enviado := false;
  end if;
  if new.data_proxima_manutencao is distinct from old.data_proxima_manutencao then
    new.alerta_manutencao_enviado := false;
  end if;
  if new.quantidade_atual > old.quantidade_atual then
    new.alerta_estoque_enviado := false;
  end if;
  return new;
end;
$$;

create trigger materiais_brigada_reset_alertas
  before update on public.materiais_brigada
  for each row execute function public.reset_alertas_material();

create trigger materiais_brigada_touch_updated_at before update on public.materiais_brigada
  for each row execute function public.touch_updated_at();

create trigger configuracoes_sistema_touch_updated_at before update on public.configuracoes_sistema
  for each row execute function public.touch_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────

alter table public.materiais_brigada enable row level security;
alter table public.historico_materiais_brigada enable row level security;
alter table public.materiais_brigada_anexos enable row level security;
alter table public.configuracoes_sistema enable row level security;

-- materiais_brigada: leitura geral; escrita só Coordenador (mesmo padrão de extintores).
create policy "materiais_brigada_select_authenticated" on public.materiais_brigada
  for select to authenticated using (true);
create policy "materiais_brigada_insert_coordenador" on public.materiais_brigada
  for insert to authenticated with check (public.current_cargo() = 'Coordenador');
create policy "materiais_brigada_update_coordenador" on public.materiais_brigada
  for update to authenticated using (public.current_cargo() = 'Coordenador') with check (public.current_cargo() = 'Coordenador');
create policy "materiais_brigada_delete_coordenador" on public.materiais_brigada
  for delete to authenticated using (public.current_cargo() = 'Coordenador');

-- historico_materiais_brigada: só leitura pelo client; escrita apenas pelo trigger.
create policy "historico_materiais_select_authenticated" on public.historico_materiais_brigada
  for select to authenticated using (true);

-- materiais_brigada_anexos: leitura geral; escrita só Coordenador.
create policy "materiais_anexos_select_authenticated" on public.materiais_brigada_anexos
  for select to authenticated using (true);
create policy "materiais_anexos_insert_coordenador" on public.materiais_brigada_anexos
  for insert to authenticated with check (public.current_cargo() = 'Coordenador');
create policy "materiais_anexos_delete_coordenador" on public.materiais_brigada_anexos
  for delete to authenticated using (public.current_cargo() = 'Coordenador');

-- configuracoes_sistema: leitura geral; escrita só Coordenador.
create policy "configuracoes_sistema_select_authenticated" on public.configuracoes_sistema
  for select to authenticated using (true);
create policy "configuracoes_sistema_update_coordenador" on public.configuracoes_sistema
  for update to authenticated using (public.current_cargo() = 'Coordenador') with check (public.current_cargo() = 'Coordenador');

-- ── Storage (anexos) ─────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('materiais-anexos', 'materiais-anexos', false)
on conflict (id) do nothing;

create policy "materiais_anexos_storage_select_authenticated"
  on storage.objects for select to authenticated
  using (bucket_id = 'materiais-anexos');

create policy "materiais_anexos_storage_insert_coordenador"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'materiais-anexos' and public.current_cargo() = 'Coordenador');

create policy "materiais_anexos_storage_delete_coordenador"
  on storage.objects for delete to authenticated
  using (bucket_id = 'materiais-anexos' and public.current_cargo() = 'Coordenador');
