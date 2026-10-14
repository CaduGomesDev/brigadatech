-- Corrige vazamento de dados sensíveis: a policy anterior
-- ("chamados_select_authenticated", using (true)) deixava qualquer
-- autenticado ler sinais vitais e a descrição clínica de TODOS os
-- atendimentos via select('*') direto no cliente, bypassando a UI
-- (que só mostra esses campos para Supervisor/Coordenador em
-- HistoricoChamados.tsx). Agora a tabela completa só é legível por
-- Supervisor, Coordenador ou pelo autor do próprio registro.

drop policy "chamados_select_authenticated" on public.chamados_brigada;

create policy "chamados_select_restricted" on public.chamados_brigada
  for select to authenticated
  using (
    public.current_cargo() in ('Coordenador', 'Supervisor')
    or created_by = auth.uid()
  );

-- View pública e somente-leitura com os campos não sensíveis, usada pelo
-- Dashboard, Busca Global e Relatório Gerencial — telas abertas a todos os
-- cargos. A view roda com o owner do objeto (não sofre a RLS acima), então
-- continua retornando todas as linhas, mas sem os campos clínicos.
-- "dados_atendimento" só é exposto para Ginástica Laboral (texto não-clínico,
-- usado só pra extrair os setores concluídos); em qualquer outra situação o
-- campo vem nulo.
create view public.chamados_brigada_resumo as
select
  id,
  brigadista,
  colaborador_atendido,
  situacao,
  created_at,
  case when situacao = 'Ginástica Laboral' then dados_atendimento else null end as dados_atendimento
from public.chamados_brigada;

grant select on public.chamados_brigada_resumo to authenticated;

notify pgrst, 'reload schema';
