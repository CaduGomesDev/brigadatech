-- Lista de brigadistas: antes hardcoded em src/constants/brigadistas.ts,
-- agora em tabela propria para nao expor nomes no bundle do frontend.

create table public.brigadistas (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create index brigadistas_ativo_idx on public.brigadistas(ativo);

alter table public.brigadistas enable row level security;

create policy "brigadistas_select_authenticated" on public.brigadistas
  for select to authenticated using (true);
create policy "brigadistas_insert_coordenador" on public.brigadistas
  for insert to authenticated with check (public.current_cargo() = 'Coordenador');
create policy "brigadistas_update_coordenador" on public.brigadistas
  for update to authenticated using (public.current_cargo() = 'Coordenador') with check (public.current_cargo() = 'Coordenador');
create policy "brigadistas_delete_coordenador" on public.brigadistas
  for delete to authenticated using (public.current_cargo() = 'Coordenador');

insert into public.brigadistas (nome) values
  ('Carlos Eduardo Oliveira Gomes')
on conflict (nome) do nothing;
