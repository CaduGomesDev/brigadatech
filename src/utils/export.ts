import { Chamado } from '../types'
import { formatDate } from './formatters'

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
