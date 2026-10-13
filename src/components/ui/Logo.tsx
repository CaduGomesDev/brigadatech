import React, { useState } from 'react'

const shinyStyle: React.CSSProperties = {
  backgroundImage: 'linear-gradient(to right, #5C0000 0%, #FF8080 30%, #FF1744 50%, #FF8080 70%, #5C0000 100%)',
  backgroundSize: '200% auto',
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  color: 'transparent',
  WebkitTextFillColor: 'transparent',
}

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon'
}

export function Logo({ size = 'md', variant = 'full' }: LogoProps) {
  const iconSizeClass = { sm: 'h-8 w-8', md: 'h-9 w-9', lg: 'h-11 w-11' }[size]
  const brigSize      = { sm: 'text-2xl', md: 'text-4xl', lg: 'text-6xl' }[size]
  const [hovered, setHovered] = useState(false)

  return (
    <div className="flex items-center">
      {variant === 'full' && (
        <div
          className="flex flex-col items-center gap-2 cursor-default select-none"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <span className={`${brigSize} font-black tracking-tight leading-tight`}>
            <span style={{ color: '#ffffff' }}>Brigada</span>
            <span className="animate-shiny" style={shinyStyle}>Tech</span>
          </span>
          <div
            style={{
              height: 2.2,
              width: hovered ? 144 : 40,
              borderRadius: 99,
              background: '#C40018',
              transition: 'width 1.1s cubic-bezier(0.22,1,0.36,1)',
            }}
          />
        </div>
      )}
      {variant === 'icon' && (
        <div className={`${iconSizeClass} rounded-[8px] overflow-hidden flex-shrink-0 flex items-center justify-center logo-glow`}>
          <img
            src="/favicon.png"
            alt="BrigadaTech"
            className="h-full w-full object-cover"
          />
        </div>
      )}
    </div>
  )
}
