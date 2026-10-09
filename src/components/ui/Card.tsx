import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ children, className = '', hover = false, onClick, padding = 'md' }: CardProps) {
  const paddings = {
    none: '',
    sm: 'p-3 md:p-4',
    md: 'p-4 md:p-6',
    lg: 'p-5 md:p-8',
  }

  return (
    <div
      onClick={onClick}
      className={`
        w-full min-w-0
        bg-brand-gray-900 border border-brand-gray-700 rounded-2xl
        shadow-card animate-fade-in
        ${hover ? 'hover:border-brand-gray-600 hover:shadow-card-hover transition-all duration-300 cursor-pointer' : ''}
        ${paddings[padding]}
        ${className}
      `}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export function CardHeader({ title, subtitle, icon, action }: CardHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 mb-5 flex-wrap">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-brand-red/10 border border-brand-red/20 flex items-center justify-center text-brand-red flex-shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-base md:text-lg font-bold text-white leading-snug">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5 leading-snug">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  )
}
