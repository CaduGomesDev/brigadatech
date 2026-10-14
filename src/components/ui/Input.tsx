import React, { useRef } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export function Input({ label, error, hint, icon, iconRight, className = '', type, ...props }: InputProps) {
  const isDate = type === 'date'
  const isNumber = type === 'number'
  const numberRef = useRef<HTMLInputElement>(null)

  const step = (e: React.MouseEvent, dir: 1 | -1) => {
    e.preventDefault()
    const input = numberRef.current
    if (!input || props.disabled) return
    const stepAmount = Number(props.step) || 1
    const current = Number(input.value || 0)
    let next = dir === 1 ? current + stepAmount : current - stepAmount
    if (props.min !== undefined && next < Number(props.min)) next = Number(props.min)
    if (props.max !== undefined && next > Number(props.max)) next = Number(props.max)

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
    setter?.call(input, String(next))
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.focus()
  }

  return (
    <div className="flex flex-col gap-1.5 min-w-0 w-full">
      {label && (
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {label}
          {props.required && <span className="text-brand-red ml-1">*</span>}
        </label>
      )}
      <div className="relative w-full min-w-0">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10">
            {icon}
          </div>
        )}
        <input
          ref={isNumber ? numberRef : undefined}
          type={type}
          {...props}
          className={`
            w-full min-w-0 bg-brand-gray-800 border border-brand-gray-600 rounded-xl
            text-white placeholder-gray-600
            text-base md:text-sm
            px-4 py-2.5 h-11
            ${icon ? 'pl-10' : ''}
            ${iconRight ? 'pr-10' : ''}
            ${isNumber ? 'pr-9' : ''}
            ${isDate ? 'date-input active:scale-[0.98] active:border-brand-red active:ring-1 active:ring-brand-red/60 active:[transition:none]' : ''}
            focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : ''}
            ${className}
          `}
        />
        {iconRight && !isNumber && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            {iconRight}
          </div>
        )}
        {isNumber && !props.disabled && (
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex flex-col h-8 w-6 rounded-lg overflow-hidden border border-brand-gray-600/70 divide-y divide-brand-gray-600/70">
            <button
              type="button"
              tabIndex={-1}
              onClick={e => step(e, 1)}
              className="flex-1 flex items-center justify-center text-gray-500 bg-brand-gray-700/60 hover:text-brand-red hover:bg-brand-gray-700 active:scale-90 transition-all duration-150"
              aria-label="Aumentar"
            >
              <ChevronUp size={11} strokeWidth={2.75} />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={e => step(e, -1)}
              className="flex-1 flex items-center justify-center text-gray-500 bg-brand-gray-700/60 hover:text-brand-red hover:bg-brand-gray-700 active:scale-90 transition-all duration-150"
              aria-label="Diminuir"
            >
              <ChevronDown size={11} strokeWidth={2.75} />
            </button>
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  )
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

export function Textarea({ label, error, hint, className = '', ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0 w-full">
      {label && (
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {label}
          {props.required && <span className="text-brand-red ml-1">*</span>}
        </label>
      )}
      <textarea
        {...props}
        className={`
          w-full min-w-0 bg-brand-gray-800 border border-brand-gray-600 rounded-xl
          text-white placeholder-gray-600
          text-base md:text-sm
          px-4 py-3 min-h-[120px] resize-y
          focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  hint?: string
  icon?: React.ReactNode
  options: { value: string; label: string }[]
  placeholder?: string
}

export function Select({ label, error, hint, icon, options, placeholder, className = '', ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0 w-full">
      {label && (
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          {label}
          {props.required && <span className="text-brand-red ml-1">*</span>}
        </label>
      )}
      <div className="relative w-full min-w-0">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 z-10 pointer-events-none">
            {icon}
          </div>
        )}
        <select
          {...props}
          className={`
            w-full min-w-0 bg-brand-gray-800 border border-brand-gray-600 rounded-xl
            text-white appearance-none cursor-pointer
            text-base md:text-sm
            px-4 py-2.5 h-11 pr-9
            ${icon ? 'pl-10' : ''}
            focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red/50
            transition-all duration-200
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-red-500' : ''}
            ${className}
          `}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-brand-gray-800">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 8L1 3h10L6 8z" />
          </svg>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-600">{hint}</p>}
    </div>
  )
}
