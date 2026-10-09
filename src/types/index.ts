// Hierarquia: índice 0 = maior permissão
export type Cargo = 'Coordenador' | 'Supervisor' | 'Gerente'

export const CARGOS: readonly Cargo[] = [
  'Coordenador',
  'Supervisor',
  'Gerente',
] as const

export interface Profile {
  id: string
  nome: string
  email: string
  cargo: Cargo
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

export interface Chamado {
  id: string
  brigadista: string
  colaborador_atendido: string
  situacao: string
  pressao_arterial: string | null
  bpm: string | null
  temperatura: string | null
  saturacao: string | null
  dados_atendimento: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface DashboardStats {
  total: number
  hoje: number
  totalOperacional: number
  totalRotina: number
  hojeOperacional: number
  topBrigadista: string
  situacaoMaisRecorrente: string
}

export type SituacaoType =
  | 'Mal-Estar Geral'
  | 'Desmaio / Lipotímia'
  | 'Crise Hipertensiva'
  | 'Crise Hipoglicêmica'
  | 'Reação Alérgica'
  | 'Crise de Ansiedade / Pânico'
  | 'Trauma / Queda'
  | 'Queimadura'
  | 'Corte / Laceração'
  | 'Crise Epiléptica'
  | 'Dor Torácica'
  | 'Dificuldade Respiratória'
  | 'Atendimento de Rotina'
  | 'Ginástica Laboral'
  | 'Outros'

export const SITUACOES_ROTINA: readonly SituacaoType[] = [
  'Atendimento de Rotina',
  'Ginástica Laboral',
] as const

export type ChecklistItem = 'Conforme' | 'Não Conforme' | 'Não Aplicável'
export type SituacaoExtintor = 'Conforme' | 'Não Conforme' | 'Em Manutenção' | 'Vencido'

export interface Extintor {
  id: string
  numero: string
  localizacao: string
  tipo: string
  capacidade: string
  suporte_altura: ChecklistItem
  selo_inmetro: ChecklistItem
  lacre_pino: ChecklistItem
  manometro: ChecklistItem
  corpo_extintor: ChecklistItem
  mangueira_bico: ChecklistItem
  valvula_bico: ChecklistItem
  valvula_gatilho: ChecklistItem
  validade: string
  ultima_inspecao: string
  situacao: SituacaoExtintor
  observacoes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface HistoricoExtintor {
  id: string
  extintor_id: string | null
  extintor_numero: string
  acao: string
  usuario_id: string | null
  usuario_nome: string | null
  detalhes: Record<string, unknown> | null
  created_at: string
}

export interface Notificacao {
  id: string
  titulo: string
  mensagem: string
  fixada: boolean
  autor_id: string
  autor_nome: string
  cargo_autor: string
  created_at: string
  updated_at: string
}

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
}

export interface FilterState {
  search: string
  brigadista: string
}
