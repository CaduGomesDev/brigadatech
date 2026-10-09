import { ChevronUp, ChevronDown } from 'lucide-react'

interface SortIconProps {
  col: string
  sortKey: string
  sortDir: 'asc' | 'desc'
}

export function TableSortIcon({ col, sortKey, sortDir }: SortIconProps) {
  if (sortKey !== col) return <ChevronDown size={12} className="text-gray-700" />
  return sortDir === 'asc'
    ? <ChevronUp size={12} className="text-brand-red" />
    : <ChevronDown size={12} className="text-brand-red" />
}

interface EmptyStateProps {
  icon: React.ReactElement<{ size: number; className: string }>
  title: string
  description: string
}

import React from 'react'

export function TableEmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-gray-700 flex items-center justify-center mb-4">
        {React.cloneElement(icon, { size: 32, className: 'text-gray-600' })}
      </div>
      <h3 className="text-lg font-semibold text-gray-400">{title}</h3>
      <p className="text-sm text-gray-600 mt-1">{description}</p>
    </div>
  )
}
