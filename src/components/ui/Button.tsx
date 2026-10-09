import React from 'react'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconRight,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-black disabled:opacity-50 disabled:cursor-not-allowed active:scale-95'

  const variants = {
    primary: 'bg-brand-red hover:bg-brand-red-dark text-white focus:ring-brand-red shadow-lg hover:shadow-red-glow',
    secondary: 'bg-brand-gray-700 hover:bg-brand-gray-600 text-white focus:ring-brand-gray-500',
    ghost: 'bg-transparent hover:bg-brand-gray-700 text-gray-300 hover:text-white focus:ring-brand-gray-600',
    danger: 'bg-red-900/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-800/50 focus:ring-red-700',
    success: 'bg-green-600 hover:bg-green-500 text-white focus:ring-green-500 shadow-lg hover:shadow-green-900/40',
    outline: 'bg-transparent border border-brand-gray-600 hover:border-brand-red text-gray-300 hover:text-white focus:ring-brand-gray-500',
  }

  const sizes = {
    sm: 'text-xs px-3 py-1.5 h-8',
    md: 'text-sm px-4 py-2 h-10',
    lg: 'text-base px-6 py-3 h-12',
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
}
