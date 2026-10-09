import { supabase } from './supabase'

export type AcaoAuditoria =
  | 'login'
  | 'logout'
  | 'insert_chamado'
  | 'delete_chamado'
  | 'view_chamado'
  | 'export_csv'
  | 'export_pdf'
  | 'toggle_role'
  | 'update_cargo'
  | 'update_chamado'
  | 'aceite_termos'
  | 'solicitar_exclusao'
  | 'insert_extintor'
  | 'update_extintor'
  | 'delete_extintor'
  | 'view_extintor'
  | 'create_user'

export async function logAuditoria(
  userId: string,
  acao: AcaoAuditoria,
  detalhes?: Record<string, unknown>
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      acao,
      detalhes: detalhes ?? null,
    })
  } catch (err) {
    // Auditoria não interrompe o fluxo principal, mas a falha é registrada para observabilidade
    console.error('[audit] Falha ao registrar evento:', { userId, acao, err })
  }
}
