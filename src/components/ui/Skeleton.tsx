import React from 'react'

interface SkeletonProps {
  className?: string
  rows?: number
}

export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div style={style} className={`animate-pulse bg-brand-gray-700 rounded-lg ${className}`} />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-brand-gray-900 border border-brand-gray-700 rounded-2xl p-6 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-brand-gray-700" />
        <div className="flex-1">
          <div className="h-3 bg-brand-gray-700 rounded mb-2 w-1/3" />
          <div className="h-2 bg-brand-gray-700 rounded w-1/4" />
        </div>
      </div>
      <div className="h-8 bg-brand-gray-700 rounded w-1/2 mb-2" />
      <div className="h-2 bg-brand-gray-700 rounded w-2/3" />
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: SkeletonProps) {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-brand-gray-700 rounded-xl mb-3" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 bg-brand-gray-800 border-b border-brand-gray-700 flex items-center px-4 gap-4">
          <div className="h-3 bg-brand-gray-700 rounded w-24" />
          <div className="h-3 bg-brand-gray-700 rounded w-32" />
          <div className="h-3 bg-brand-gray-700 rounded w-28" />
          <div className="h-3 bg-brand-gray-700 rounded w-20" />
          <div className="h-6 bg-brand-gray-700 rounded-full w-20 ml-auto" />
        </div>
      ))}
    </div>
  )
}
