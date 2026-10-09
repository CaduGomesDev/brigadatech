import { Layout } from '../components/layout/Layout'
import { HistoricoChamados } from '../components/chamados/HistoricoChamados'

export function HistoricoPage() {
  return (
    <Layout title="Histórico de Relatórios">
      <HistoricoChamados />
    </Layout>
  )
}
