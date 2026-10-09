/**
 * POLÍTICA DE RETENÇÃO DE DADOS — BrigadaTech
 * LGPD Art. 15 — Término do tratamento de dados pessoais
 *
 * Todos os prazos são contados a partir da data do último evento relevante
 * (último acesso ativo, data do atendimento, data do desligamento, etc.).
 * Após o prazo, os dados devem ser anonimizados ou eliminados pelo administrador.
 */
export const RETENCAO = {
  /**
   * Dados de perfil de usuário: nome, e-mail, cargo, role.
   * Base: cumprimento de obrigação legal trabalhista (CLT + e-Social).
   * Prazo: 5 anos após desligamento ou encerramento da conta.
   */
  profiles: {
    anos: 5,
    descricao: 'Perfis de usuário',
    fundamento: 'CLT / e-Social',
  },

  /**
   * Registros de atendimento de brigada, incluindo sinais vitais e dados clínicos.
   * Base: NR-7 (PCMSO) — documentação obrigatória de saúde ocupacional.
   * Prazo: 20 anos após a data do atendimento (NR-7, item 7.5.32.3).
   * ATENÇÃO: este prazo limita a possibilidade de atendimento imediato de
   * solicitações de exclusão para registros clínicos.
   */
  chamados_brigada: {
    anos: 20,
    descricao: 'Registros de atendimento e dados de saúde',
    fundamento: 'NR-7 (PCMSO), item 7.5.32.3',
  },

  /**
   * Logs de auditoria de ações sensíveis no sistema.
   * Base: interesse legítimo e segurança da informação (LGPD Art. 7º, IX).
   * Prazo: 2 anos.
   */
  audit_logs: {
    anos: 2,
    descricao: 'Logs de auditoria',
    fundamento: 'Interesse legítimo / Segurança da informação',
  },

  /**
   * Registros de aceite dos Termos de Uso e Política de Privacidade.
   * Base: cumprimento de obrigação legal — prova de ciência do titular.
   * Prazo: 5 anos.
   */
  aceites_termos: {
    anos: 5,
    descricao: 'Registros de aceite dos termos',
    fundamento: 'LGPD — prova de ciência',
  },

  /**
   * Solicitações de exclusão de dados pelos titulares.
   * Base: cumprimento de obrigação legal (LGPD Art. 18).
   * Prazo: 5 anos (comprovação de atendimento ao titular).
   */
  solicitacoes_exclusao: {
    anos: 5,
    descricao: 'Solicitações de exclusão de dados',
    fundamento: 'LGPD Art. 18 — comprovação de atendimento',
  },

  /**
   * Registros de inspeção de extintores e equipamentos de segurança.
   * Base: NR-23 (Proteção contra Incêndios) — obrigação de manutenção de registros.
   * Prazo: 5 anos após a data da inspeção.
   */
  extintores: {
    anos: 5,
    descricao: 'Registros de inspeção de extintores',
    fundamento: 'NR-23 — Proteção contra Incêndios',
  },
} as const
