alter table public.extintores
  add column alerta_vencimento_enviado boolean not null default false;

create or replace function public.reset_alerta_vencimento_extintor()
returns trigger
language plpgsql
as $$
begin
  if new.validade is distinct from old.validade then
    new.alerta_vencimento_enviado := false;
  end if;
  return new;
end;
$$;

create trigger extintores_reset_alerta_vencimento
  before update on public.extintores
  for each row
  execute function public.reset_alerta_vencimento_extintor();
