import { format, formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch {
    return dateStr
  }
}

export function formatDateShort(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return dateStr
  }
}

export function formatRelative(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true, locale: ptBR })
  } catch {
    return dateStr
  }
}

export function formatChartDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd/MM', { locale: ptBR })
  } catch {
    return dateStr
  }
}

export function getSituacaoColor(situacao: string): string {
  const critical = ['Crise Hipertensiva', 'Dor Torácica', 'Dificuldade Respiratória', 'Crise Epiléptica']
  const moderate = ['Desmaio / Lipotímia', 'Crise Hipoglicêmica', 'Reação Alérgica']
  if (critical.includes(situacao)) return 'text-red-400'
  if (moderate.includes(situacao)) return 'text-yellow-400'
  return 'text-gray-300'
}
