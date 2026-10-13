import { Chamado, MaterialBrigada } from '../types'
import { formatDate, formatDateShort } from './formatters'

interface AtendimentoPDFData {
  brigadista: string
  colaborador_atendido: string
  situacao: string
  pressao_arterial: string
  bpm: string
  temperatura: string
  saturacao: string
  dados_atendimento: string
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// Previne CSV/Formula Injection (OWASP): células que iniciam com =, +, -, @, TAB ou CR
// recebem um apóstrofo prefixado, que editores de planilha interpretam como texto literal.
function sanitizeCsvCell(value: string): string {
  if (/^[=+\-@\t\r]/.test(value)) return `'${value}`
  return value
}

export function exportToCSV(
  chamados: Chamado[],
  filename = 'chamados_brigada',
  emailMap: Record<string, string> = {},
): void {
  const headers = [
    'Data/Hora',
    'Brigadista',
    'Colaborador Atendido',
    'Situação',
    'Registrado por',
    'Pressão Arterial',
    'BPM',
    'Temperatura',
    'Saturação',
    'Dados do Atendimento',
  ]

  const rows = chamados.map((c) => [
    sanitizeCsvCell(formatDate(c.created_at)),
    sanitizeCsvCell(c.brigadista),
    sanitizeCsvCell(c.colaborador_atendido),
    sanitizeCsvCell(c.situacao),
    sanitizeCsvCell(c.created_by ? (emailMap[c.created_by] ?? '') : ''),
    sanitizeCsvCell(c.pressao_arterial || ''),
    sanitizeCsvCell(c.bpm || ''),
    sanitizeCsvCell(c.temperatura || ''),
    sanitizeCsvCell(c.saturacao || ''),
    sanitizeCsvCell((c.dados_atendimento || '').replace(/\n/g, ' ')),
  ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n')

  const bom = '﻿'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportToPDF(chamados: Chamado[], emailMap: Record<string, string> = {}): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Permita pop-ups neste site para exportar o PDF e tente novamente.')
    return
  }

  const rows = chamados
    .map(
      (c) => `
      <tr>
        <td>${escapeHtml(formatDate(c.created_at))}</td>
        <td>${escapeHtml(c.brigadista)}</td>
        <td>${escapeHtml(c.colaborador_atendido)}</td>
        <td>${escapeHtml(c.situacao)}</td>
        <td>${escapeHtml(c.created_by ? (emailMap[c.created_by] ?? '-') : '-')}</td>
        <td>${escapeHtml(c.pressao_arterial || '-')}</td>
        <td>${escapeHtml(c.bpm || '-')}</td>
        <td>${escapeHtml(c.temperatura || '-')}</td>
        <td>${escapeHtml(c.saturacao || '-')}</td>
      </tr>`
    )
    .join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Chamados Brigada - BrigadaTech</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
        h1 { color: #C40018; font-size: 18px; margin-bottom: 4px; }
        h2 { color: #444; font-size: 13px; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #C40018; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
        td { padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 10px; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .footer { margin-top: 20px; font-size: 10px; color: #999; }
      </style>
    </head>
    <body>
      <h1>BRIGADATECH</h1>
      <h2>Brigada Corporativa — Relatório de Chamados</h2>
      <p>Gerado em: ${escapeHtml(formatDate(new Date().toISOString()))} | Total: ${chamados.length} registros</p>
      <table>
        <thead>
          <tr>
            <th>Data/Hora</th><th>Brigadista</th><th>Colaborador</th>
            <th>Situação</th><th>Registrado por</th><th>PA</th><th>BPM</th>
            <th>Temp.</th><th>Sat.</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">BrigadaTech | Central de Chamados &copy; ${new Date().getFullYear()}</div>
    </body>
    </html>
  `)
  printWindow.document.close()
  setTimeout(() => printWindow.print(), 500)
}

export function exportAtendimentoPDF(data: AtendimentoPDFData): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Permita pop-ups neste site para exportar o PDF e tente novamente.')
    return
  }

  const agora = formatDate(new Date().toISOString())

  const vitais = [
    ['Pressão Arterial', data.pressao_arterial],
    ['BPM', data.bpm],
    ['Temperatura', data.temperatura],
    ['Saturação O₂', data.saturacao],
  ].filter(([, v]) => v)

  const vitaisHtml = vitais.length
    ? `
      <table class="info">
        ${vitais.map(([label, v]) => `
          <tr><th>${escapeHtml(label)}</th><td>${escapeHtml(v)}</td></tr>
        `).join('')}
      </table>`
    : ''

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Relatório de Atendimento - BrigadaTech</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
        h1 { color: #C40018; font-size: 20px; margin-bottom: 2px; }
        h2 { color: #444; font-size: 13px; margin-top: 0; font-weight: normal; }
        .meta { color: #777; font-size: 11px; margin-top: 2px; }
        table.info { width: 100%; border-collapse: collapse; margin-top: 18px; }
        table.info th { text-align: left; width: 180px; padding: 7px 10px; background: #f3f3f3; border: 1px solid #ddd; font-size: 11px; color: #555; }
        table.info td { padding: 7px 10px; border: 1px solid #ddd; font-size: 12px; }
        .descricao { margin-top: 18px; }
        .descricao h3 { font-size: 12px; color: #555; margin-bottom: 4px; }
        .descricao p { white-space: pre-wrap; border: 1px solid #ddd; border-radius: 4px; padding: 10px; min-height: 60px; font-size: 12px; }
        .ciencia { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ccc; font-size: 11px; color: #333; line-height: 1.6; }
        .assinaturas { margin-top: 56px; display: flex; justify-content: space-between; }
        .assinatura { width: 46%; text-align: center; }
        .linha { border-top: 1px solid #333; margin-bottom: 6px; }
        .footer { margin-top: 30px; font-size: 10px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <h1>BRIGADATECH</h1>
      <h2>Relatório de Atendimento — Termo de Ciência do Colaborador</h2>
      <p class="meta">Gerado em: ${escapeHtml(agora)}</p>

      <table class="info">
        <tr><th>Brigadista Responsável</th><td>${escapeHtml(data.brigadista || '-')}</td></tr>
        <tr><th>Colaborador Atendido</th><td>${escapeHtml(data.colaborador_atendido || '-')}</td></tr>
        <tr><th>Situação / Ocorrência</th><td>${escapeHtml(data.situacao || '-')}</td></tr>
      </table>

      ${vitaisHtml}

      <div class="descricao">
        <h3>Descrição / Conduta Adotada</h3>
        <p>${escapeHtml(data.dados_atendimento || 'Nenhuma observação registrada.')}</p>
      </div>

      <div class="ciencia">
        Declaro, para os devidos fins, estar ciente do atendimento acima descrito, das informações nele
        contidas e da situação registrada pela equipe de brigada de emergência.
      </div>

      <div class="assinaturas">
        <div class="assinatura">
          <div class="linha"></div>
          Assinatura do Colaborador<br />${escapeHtml(data.colaborador_atendido || '')}
        </div>
        <div class="assinatura">
          <div class="linha"></div>
          Assinatura do Brigadista<br />${escapeHtml(data.brigadista || '')}
        </div>
      </div>

      <div class="footer">BrigadaTech | Central de Chamados &copy; ${new Date().getFullYear()}</div>
    </body>
    </html>
  `)
  printWindow.document.close()
  setTimeout(() => printWindow.print(), 500)
}

export function exportMateriaisCSV(materiais: MaterialBrigada[], filename = 'materiais_brigada'): void {
  const headers = [
    'Nome', 'Categoria', 'Tipo', 'Quantidade', 'Unidade', 'Estoque Mínimo',
    'Local', 'Responsável', 'Lote', 'Validade', 'Patrimônio', 'Estado de Conservação',
    'Última Inspeção', 'Próxima Manutenção',
  ]

  const rows = materiais.map((m) => [
    sanitizeCsvCell(m.nome),
    sanitizeCsvCell(m.categoria),
    sanitizeCsvCell(m.tipo_item),
    sanitizeCsvCell(String(m.quantidade_atual)),
    sanitizeCsvCell(m.unidade_medida),
    sanitizeCsvCell(String(m.estoque_minimo)),
    sanitizeCsvCell(m.local_armazenamento),
    sanitizeCsvCell(m.responsavel),
    sanitizeCsvCell(m.lote || ''),
    sanitizeCsvCell(m.data_validade ? formatDateShort(m.data_validade) : ''),
    sanitizeCsvCell(m.numero_patrimonio || ''),
    sanitizeCsvCell(m.estado_conservacao || ''),
    sanitizeCsvCell(m.data_ultima_inspecao ? formatDateShort(m.data_ultima_inspecao) : ''),
    sanitizeCsvCell(m.data_proxima_manutencao ? formatDateShort(m.data_proxima_manutencao) : ''),
  ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(','))
    .join('\n')

  const bom = '﻿'
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportMateriaisPDF(materiais: MaterialBrigada[]): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Permita pop-ups neste site para exportar o PDF e tente novamente.')
    return
  }

  const rows = materiais
    .map(
      (m) => `
      <tr>
        <td>${escapeHtml(m.nome)}</td>
        <td>${escapeHtml(m.categoria)}</td>
        <td>${escapeHtml(m.tipo_item)}</td>
        <td>${escapeHtml(String(m.quantidade_atual))} ${escapeHtml(m.unidade_medida)}</td>
        <td>${escapeHtml(m.local_armazenamento)}</td>
        <td>${escapeHtml(m.responsavel)}</td>
        <td>${escapeHtml(m.data_validade ? formatDateShort(m.data_validade) : '-')}</td>
        <td>${escapeHtml(m.data_proxima_manutencao ? formatDateShort(m.data_proxima_manutencao) : '-')}</td>
      </tr>`
    )
    .join('')

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Materiais e Equipamentos - BrigadaTech</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 10px; color: #111; }
        h1 { color: #C40018; font-size: 18px; margin-bottom: 4px; }
        h2 { color: #444; font-size: 13px; margin-top: 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { background: #C40018; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
        td { padding: 5px 8px; border-bottom: 1px solid #ddd; font-size: 10px; }
        tr:nth-child(even) td { background: #f9f9f9; }
        .footer { margin-top: 20px; font-size: 10px; color: #999; }
      </style>
    </head>
    <body>
      <h1>BRIGADATECH</h1>
      <h2>Materiais e Equipamentos da Brigada</h2>
      <p>Gerado em: ${escapeHtml(formatDate(new Date().toISOString()))} | Total: ${materiais.length} itens</p>
      <table>
        <thead>
          <tr>
            <th>Nome</th><th>Categoria</th><th>Tipo</th><th>Qtd.</th>
            <th>Local</th><th>Responsável</th><th>Validade</th><th>Próx. Manutenção</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="footer">BrigadaTech | Materiais e Equipamentos &copy; ${new Date().getFullYear()}</div>
    </body>
    </html>
  `)
  printWindow.document.close()
  setTimeout(() => printWindow.print(), 500)
}
