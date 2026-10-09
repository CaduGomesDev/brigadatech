import type { ReactNode } from 'react'
import { ArrowLeft, Shield, FileText } from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import { VERSAO_TERMOS } from '../contexts/LgpdContext'
import { RETENCAO } from '../lib/retencao'

export function TermosPage() {
  const dataAtualizacao = new Date(2026, 5, 9).toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-brand-gray-700">
      <header className="sticky top-0 z-10 bg-brand-gray-800 border-b border-brand-gray-700 px-4 py-3 flex items-center gap-4">
        <a
          href="/auth"
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft size={16} />
          Voltar
        </a>
        <div className="ml-auto">
          <Logo size="sm" variant="full" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield size={28} className="text-brand-red" />
            <FileText size={28} className="text-gray-400" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2">
            Termos de Uso & Política de Privacidade
          </h1>
          <p className="text-gray-500 text-sm">
            BrigadaTech — Sistema de Gestão de Brigada Corporativa<br />
            Versão {VERSAO_TERMOS} · Última atualização: {dataAtualizacao}
          </p>
        </div>

        <div className="space-y-6 text-gray-300 text-sm leading-relaxed">

          {/* ── POLÍTICA DE PRIVACIDADE ── */}
          <Secao titulo="POLÍTICA DE PRIVACIDADE" icone={<Shield size={18} className="text-brand-red" />}>

            <SubSecao titulo="1. Controlador dos Dados">
              <p>
                O <strong className="text-white">BrigadaTech</strong> é operado pela{' '}
                <strong className="text-white">BrigadaTech</strong> ("Empresa", "nós"),
                na qualidade de controladora dos dados pessoais tratados nesta plataforma, nos
                termos do Art. 5º, VI da Lei nº 13.709/2018 (LGPD).
              </p>
            </SubSecao>

            <SubSecao titulo="2. Dados Coletados">
              <p>O sistema coleta e trata as seguintes categorias de dados pessoais:</p>
              <ul className="mt-3 space-y-2">
                <Item>
                  <strong className="text-gray-200">Dados de identificação:</strong> nome completo,
                  <strong className="text-gray-200"> e-mail corporativo</strong> (fornecido pela
                  BrigadaTech) e cargo dos membros da brigada. O acesso ao sistema é restrito
                  a titulares de conta de e-mail corporativo ativo.
                </Item>
                <Item>
                  <strong className="text-gray-200">Dados operacionais:</strong> registros de
                  atendimentos de emergência — data, hora, brigadista responsável e identificação
                  do colaborador atendido.
                </Item>
                <Item>
                  <strong className="text-gray-200">Dados sensíveis de saúde (Art. 5º, II, LGPD):</strong>{' '}
                  sinais vitais (pressão arterial, frequência cardíaca, temperatura, saturação de
                  oxigênio), tipo de ocorrência clínica e descrição do atendimento prestado.
                </Item>
                <Item>
                  <strong className="text-gray-200">Dados de autenticação:</strong> tokens de
                  sessão gerenciados pelo provedor de autenticação (Supabase). A autenticação
                  utiliza exclusivamente e-mail corporativo; e-mails pessoais não são aceitos.
                </Item>
                <Item>
                  <strong className="text-gray-200">Dados de equipamentos de segurança:</strong>{' '}
                  registros de inspeção de extintores — número, localização, tipo, capacidade,
                  itens de checklist, datas de validade e situação. Vinculados ao identificador
                  do responsável pela inspeção.
                </Item>
                <Item>
                  <strong className="text-gray-200">Dados de auditoria:</strong> registro de ações
                  realizadas no sistema (login, logout, exportações, exclusões, visualizações de
                  registros clínicos) vinculadas ao identificador do usuário.
                </Item>
              </ul>
            </SubSecao>

            <SubSecao titulo="3. Finalidade e Base Legal do Tratamento">
              <p>Os dados são tratados exclusivamente para as finalidades abaixo, com as respectivas bases legais:</p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-brand-gray-600">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-brand-gray-800">
                      <th className="px-3 py-2 text-left text-gray-400 font-semibold w-1/2">Finalidade</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-semibold">Base Legal (LGPD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Linha a="Gestão de atendimentos de emergência pela brigada corporativa" b="Art. 7º, II — Cumprimento de obrigação legal (NR-23, NR-7)" />
                    <Linha a="Autenticação e controle de acesso ao sistema" b="Art. 7º, II — Obrigação legal / Art. 7º, VII — Interesse legítimo" />
                    <Linha a="Tratamento de dados de saúde dos colaboradores atendidos" b="Art. 11, II, 'a' — Proteção da vida e da saúde / Art. 11, II, 'f' — Exercício regular de direitos pelo empregador" />
                    <Linha a="Auditoria de segurança e conformidade" b="Art. 7º, II — Obrigação legal / Art. 7º, VII — Interesse legítimo" />
                    <Linha a="Relatórios gerenciais de ocorrências" b="Art. 7º, II — Cumprimento de obrigação legal (Programa de Brigada de Incêndio)" />
                    <Linha a="Gestão e inspeção de extintores e equipamentos de segurança" b="Art. 7º, II — Cumprimento de obrigação legal (NR-23)" />
                  </tbody>
                </table>
              </div>
              <div className="mt-3 p-3 bg-brand-gray-900 border border-brand-gray-700 rounded-xl text-xs text-gray-500">
                <strong className="text-gray-400">Nota importante (LGPD Art. 11):</strong> O aceite
                destes Termos de Uso é um mecanismo de ciência e não constitui, por si só, a base
                legal para o tratamento de dados sensíveis de saúde. Esse tratamento fundamenta-se
                nas hipóteses do Art. 11, II da LGPD, independentes de consentimento, por visarem
                a proteção da vida e da saúde dos titulares no contexto da saúde ocupacional.
              </div>
            </SubSecao>

            <SubSecao titulo="4. Compartilhamento de Dados">
              <p>Os dados poderão ser compartilhados com os seguintes destinatários, estritamente para as finalidades declaradas:</p>
              <ul className="mt-3 space-y-2">
                <Item>
                  <strong className="text-gray-200">Supabase Inc. (EUA):</strong> provedor de banco
                  de dados e autenticação. Os dados são transferidos internacionalmente com base em
                  cláusulas contratuais e na política de conformidade do fornecedor
                  (supabase.com/privacy).
                </Item>
                <Item>
                  <strong className="text-gray-200">Telegram Messenger (notificações internas):</strong>{' '}
                  notificações operacionais são enviadas a canais internos da brigada, contendo
                  exclusivamente o nome do brigadista e a data/hora do atendimento. Dados clínicos
                  ou de saúde <strong className="text-gray-200">não</strong> são enviados via Telegram.
                </Item>
                <Item>
                  <strong className="text-gray-200">Equipe de gestão da BrigadaTech:</strong>{' '}
                  acesso restrito a administradores do sistema para fins de gestão operacional.
                </Item>
              </ul>
            </SubSecao>

            <SubSecao titulo="5. Retenção e Descarte de Dados">
              <p>
                Os dados são retidos pelos prazos abaixo, após os quais serão anonimizados ou
                eliminados pelo administrador do sistema:
              </p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-brand-gray-600">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-brand-gray-800">
                      <th className="px-3 py-2 text-left text-gray-400 font-semibold">Categoria</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-semibold">Prazo</th>
                      <th className="px-3 py-2 text-left text-gray-400 font-semibold">Fundamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    <Linha a={RETENCAO.profiles.descricao} b={`${RETENCAO.profiles.anos} anos`} c={RETENCAO.profiles.fundamento} />
                    <Linha a={RETENCAO.chamados_brigada.descricao} b={`${RETENCAO.chamados_brigada.anos} anos`} c={RETENCAO.chamados_brigada.fundamento} />
                    <Linha a={RETENCAO.audit_logs.descricao} b={`${RETENCAO.audit_logs.anos} anos`} c={RETENCAO.audit_logs.fundamento} />
                    <Linha a={RETENCAO.aceites_termos.descricao} b={`${RETENCAO.aceites_termos.anos} anos`} c={RETENCAO.aceites_termos.fundamento} />
                    <Linha a={RETENCAO.solicitacoes_exclusao.descricao} b={`${RETENCAO.solicitacoes_exclusao.anos} anos`} c={RETENCAO.solicitacoes_exclusao.fundamento} />
                    <Linha a={RETENCAO.extintores.descricao} b={`${RETENCAO.extintores.anos} anos`} c={RETENCAO.extintores.fundamento} />
                  </tbody>
                </table>
              </div>
            </SubSecao>

            <SubSecao titulo="6. Direitos dos Titulares (Art. 18, LGPD)">
              <p>Você tem os seguintes direitos como titular dos dados:</p>
              <ul className="mt-2 space-y-1">
                {[
                  'Confirmação da existência de tratamento de seus dados;',
                  'Acesso aos dados tratados;',
                  'Correção de dados incompletos, inexatos ou desatualizados;',
                  'Anonimização, bloqueio ou eliminação de dados desnecessários;',
                  'Portabilidade dos dados a outro fornecedor de serviço;',
                  'Eliminação de dados pessoais, ressalvadas as obrigações legais de retenção;',
                  'Informação sobre os destinatários com quem os dados são compartilhados;',
                  'Revisão de decisões automatizadas.',
                ].map((d, i) => <Item key={i}>{d}</Item>)}
              </ul>
              <p className="mt-3">
                Para exercer seus direitos, acesse{' '}
                <strong className="text-white">Minha Privacidade</strong> no menu lateral do
                sistema ou entre em contato com o supervisor responsável do seu departamento.
              </p>
            </SubSecao>

            <SubSecao titulo="7. Segurança da Informação">
              <p>
                O sistema adota medidas técnicas e organizacionais para proteção dos dados pessoais,
                incluindo: autenticação com senha criptografada (bcrypt), controle de acesso baseado
                em função (RBAC), transmissão via HTTPS/TLS, sessões com expiração automática, e
                logs de auditoria para ações sensíveis.
              </p>
              <p className="mt-2">
                O acesso é restrito a titulares de <strong className="text-gray-200">e-mail
                corporativo ativo</strong> fornecido pela BrigadaTech. O desligamento do
                colaborador implica revogação imediata do acesso pelo administrador do sistema.
                O e-mail corporativo é patrimônio da Empresa e seu uso está sujeito às políticas
                internas de tecnologia da informação.
              </p>
            </SubSecao>

            <SubSecao titulo="8. Responsável pelo Tratamento de Dados">
              <p>
                Para exercer direitos previstos na LGPD, registrar dúvidas ou reclamações sobre o
                tratamento de dados pessoais, entre em contato com o supervisor responsável do seu departamento.
              </p>
              <div className="mt-2 bg-brand-gray-900 border border-brand-gray-700 rounded-xl p-3 text-xs space-y-1">
                <p className="text-gray-300 font-semibold">Responsável pelo Tratamento de Dados — BrigadaTech</p>
                <p className="text-gray-400">Entre em contato com o supervisor responsável do seu departamento.</p>
                <p className="text-gray-600">Prazo de resposta: até 15 dias úteis.</p>
              </div>
            </SubSecao>

            <SubSecao titulo="9. Alterações nesta Política">
              <p>
                Esta Política de Privacidade poderá ser atualizada periodicamente. Em caso de
                alterações relevantes, uma nova versão será publicada e o aceite será solicitado
                novamente no próximo acesso. A versão vigente está sempre disponível nesta página.
              </p>
            </SubSecao>

          </Secao>

          {/* ── TERMOS DE USO ── */}
          <Secao titulo="TERMOS DE USO" icone={<FileText size={18} className="text-gray-400" />}>

            <SubSecao titulo="1. Aceitação dos Termos">
              <p>
                Ao confirmar a ciência destes Termos de Uso, você declara ter lido, compreendido e
                concordado com todas as condições estabelecidas. Caso não concorde, não será
                possível utilizar o sistema.
              </p>
            </SubSecao>

            <SubSecao titulo="2. Descrição do Sistema">
              <p>
                O <strong className="text-white">BrigadaTech</strong> é uma plataforma de uso
                exclusivamente corporativo, destinada ao registro e gestão de atendimentos
                realizados pela Brigada de Emergência da BrigadaTech. Funcionalidades:
                registro de atendimentos com sinais vitais, controle de ginástica laboral,
                gestão e inspeção de extintores e equipamentos de segurança contra incêndio,
                dashboard analítico de ocorrências, gestão de membros da brigada e exportação
                de relatórios.
              </p>
            </SubSecao>

            <SubSecao titulo="3. Acesso e Uso Autorizado">
              <p>
                O acesso ao sistema é restrito a colaboradores autorizados pela BrigadaTech,
                utilizando exclusivamente <strong className="text-white">e-mail corporativo</strong>{' '}
                fornecido pela Empresa. É expressamente vedado:
              </p>
              <ul className="mt-2 space-y-1">
                {[
                  'Compartilhar credenciais de acesso com terceiros;',
                  'Utilizar e-mail pessoal ou de terceiros para acessar o sistema;',
                  'Registrar informações falsas, incompletas ou que não correspondam a atendimentos reais;',
                  'Acessar dados de outros usuários sem autorização expressa;',
                  'Utilizar o sistema para fins alheios à gestão da brigada corporativa;',
                  'Exportar dados para sistemas ou destinatários não autorizados pela Empresa.',
                ].map((d, i) => <Item key={i}>{d}</Item>)}
              </ul>
            </SubSecao>

            <SubSecao titulo="4. Confidencialidade">
              <p>
                Os dados registrados no sistema — especialmente dados de saúde de colaboradores
                atendidos — são estritamente confidenciais e de uso exclusivamente operacional. O
                usuário compromete-se a não divulgar, reproduzir ou compartilhar essas informações
                fora dos canais autorizados pela Empresa, incluindo após o encerramento do vínculo
                empregatício.
              </p>
            </SubSecao>

            <SubSecao titulo="5. Responsabilidades do Usuário">
              <p>O usuário é responsável por:</p>
              <ul className="mt-2 space-y-1">
                {[
                  'Manter suas credenciais (e-mail corporativo e senha) em sigilo absoluto;',
                  'Não utilizar a conta corporativa para fins pessoais ou alheios à brigada;',
                  'Notificar o administrador imediatamente em caso de desligamento ou afastamento, para revogação do acesso;',
                  'Registrar informações precisas, verídicas e completas nos atendimentos;',
                  'Reportar imediatamente ao administrador qualquer suspeita de acesso indevido;',
                  'Utilizar o sistema apenas durante o exercício de suas funções na brigada.',
                ].map((d, i) => <Item key={i}>{d}</Item>)}
              </ul>
              <p className="mt-2">
                A BrigadaTech não se responsabiliza por danos decorrentes do uso indevido das
                credenciais pelo próprio usuário. O e-mail corporativo é de propriedade da Empresa
                e pode ser desativado a qualquer momento.
              </p>
            </SubSecao>

            <SubSecao titulo="6. Auditoria">
              <p>
                O sistema mantém logs de auditoria das ações realizadas, incluindo login, logout,
                registro, visualização e exclusão de atendimentos, exportações e alterações de
                permissões. Esses registros podem ser consultados pela administração para fins de
                segurança e conformidade.
              </p>
            </SubSecao>

            <SubSecao titulo="7. Rescisão de Acesso">
              <p>
                O acesso ao sistema poderá ser revogado a qualquer momento pela BrigadaTech,
                em especial nos casos de desligamento, violação destes Termos ou necessidade
                operacional. O usuário não terá direito de retenção de dados após a revogação do
                acesso.
              </p>
            </SubSecao>

            <SubSecao titulo="8. Alterações nos Termos">
              <p>
                Estes Termos de Uso poderão ser atualizados a qualquer momento. Em caso de
                alteração relevante, uma nova versão será publicada e o aceite será solicitado
                novamente no próximo acesso. A versão vigente está sempre disponível nesta página.
              </p>
            </SubSecao>

          </Secao>

          <div className="text-center text-xs text-gray-600 pt-4 border-t border-brand-gray-700">
            BrigadaTech · Versão dos Termos {VERSAO_TERMOS}
          </div>
        </div>
      </main>
    </div>
  )
}

/* ── Componentes auxiliares ── */

function Secao({ titulo, icone, children }: { titulo: string; icone: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-brand-gray-800 border border-brand-gray-700 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-brand-gray-700 flex items-center gap-3 bg-brand-gray-900">
        {icone}
        <h2 className="text-sm font-black text-white tracking-widest uppercase">{titulo}</h2>
      </div>
      <div className="px-6 py-6 space-y-6">{children}</div>
    </div>
  )
}

function SubSecao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-gray-200 mb-2">{titulo}</h3>
      <div className="space-y-2 text-sm text-gray-400 leading-relaxed">{children}</div>
    </div>
  )
}

function Item({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2 list-none">
      <span className="text-brand-red shrink-0 mt-0.5">›</span>
      <span>{children}</span>
    </li>
  )
}

function Linha({ a, b, c }: { a: string; b: string; c?: string }) {
  return (
    <tr className="border-t border-brand-gray-700">
      <td className="px-3 py-2 text-gray-300">{a}</td>
      <td className="px-3 py-2 text-gray-300">{b}</td>
      {c !== undefined && <td className="px-3 py-2 text-gray-500">{c}</td>}
    </tr>
  )
}
