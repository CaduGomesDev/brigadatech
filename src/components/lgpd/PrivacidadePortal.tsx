import { Shield, FileText } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Card, CardHeader } from '../ui/Card'
import { formatDate } from '../../utils/formatters'

export function PrivacidadePortal() {
  const { profile } = useAuth()

  return (
    <div className="max-w-2xl space-y-5 animate-fade-in">

      {/* Seus dados */}
      <Card padding="md">
        <CardHeader
          title="Seus Dados no Sistema"
          subtitle="Informações pessoais armazenadas"
          icon={<Shield size={18} />}
        />
        <div className="divide-y divide-brand-gray-700">
          <Campo label="Nome"            value={profile?.nome    ?? '—'} />
          <Campo label="E-mail"          value={profile?.email   ?? '—'} />
          <Campo label="Cargo"           value={profile?.cargo   ?? '—'} />
          <Campo
            label="Conta criada em"
            value={profile?.created_at ? formatDate(profile.created_at) : '—'}
          />
        </div>
        <div className="mt-4 space-y-2">
          <div className="p-3 bg-brand-gray-900 border border-brand-gray-700 rounded-xl text-xs text-gray-500 leading-relaxed">
            Além dos dados acima, o sistema armazena os{' '}
            <strong className="text-gray-300">registros de atendimentos</strong> em que você
            figurou como brigadista responsável. Dados clínicos dos colaboradores atendidos são
            confidenciais e acessíveis apenas por operadores autorizados. Registros de saúde
            têm prazo de retenção legal de <strong className="text-gray-300">20 anos</strong> (NR-7).
          </div>
          <div className="p-3 bg-brand-gray-900 border border-brand-gray-700 rounded-xl text-xs text-gray-500 leading-relaxed">
            O acesso ao sistema utiliza exclusivamente{' '}
            <strong className="text-gray-300">e-mail corporativo</strong> fornecido pela
            BrigadaTech. E-mails pessoais não são aceitos. Em caso de desligamento, o acesso
            deve ser revogado pelo administrador imediatamente.
          </div>
        </div>
      </Card>

      {/* Direitos */}
      <Card padding="md">
        <CardHeader
          title="Seus Direitos (LGPD Art. 18)"
          subtitle="Como exercer seus direitos como titular de dados"
          icon={<FileText size={18} />}
        />
        <ul className="space-y-3 text-sm text-gray-400">
          <Direito
            titulo="Confirmação e acesso"
            descricao="Solicite confirmação sobre quais dados seus estão armazenados e acesse uma cópia. Entre em contato com o administrador do sistema."
          />
          <Direito
            titulo="Correção de dados"
            descricao="Corrija nome desatualizado diretamente em Configurações › Meu Perfil. Para correção de e-mail ou cargo, solicite ao administrador do sistema."
          />
          <Direito
            titulo="Eliminação de dados"
            descricao="Para solicitar a exclusão dos seus dados pessoais, entre em contato com o administrador do sistema. Registros de saúde ocupacional têm retenção mínima obrigatória de 20 anos (NR-7) e não poderão ser excluídos imediatamente."
          />
          <Direito
            titulo="Portabilidade"
            descricao="Solicite a exportação dos seus dados em formato estruturado ao administrador do sistema."
          />
          <Direito
            titulo="Revogação e oposição"
            descricao="Para revogar o aceite aos Termos ou se opor ao tratamento de dados, entre em contato com o administrador. O acesso ao sistema será revogado após a solicitação."
          />
        </ul>
        <div className="mt-4 p-3 bg-brand-gray-900 border border-brand-gray-700 rounded-xl text-xs space-y-1">
          <p className="text-gray-300 font-semibold">Responsável pelo Tratamento de Dados — BrigadaTech</p>
          <p className="text-gray-400">
            Encaminhe sua solicitação ao administrador do sistema ou ao supervisor responsável do seu departamento.
          </p>
          <p className="text-gray-600 mt-1">Prazo de resposta: até 15 dias úteis (LGPD Art. 18, § 5º).</p>
        </div>
      </Card>

      {/* Link termos */}
      <div className="text-center pb-4">
        <a
          href="/termos"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-gray-600 hover:text-brand-red transition-colors"
        >
          Ver Política de Privacidade e Termos de Uso completos →
        </a>
      </div>
    </div>
  )
}

function Campo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2.5">
      <span className="text-xs text-gray-500 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  )
}

function Direito({ titulo, descricao }: { titulo: string; descricao: string }) {
  return (
    <li className="flex gap-2">
      <span className="text-brand-red shrink-0 mt-0.5">›</span>
      <span>
        <strong className="text-gray-300">{titulo}:</strong>{' '}
        {descricao}
      </span>
    </li>
  )
}
