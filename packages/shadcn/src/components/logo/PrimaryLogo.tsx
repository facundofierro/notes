import React from 'react'

interface PrimaryLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'white'
}

const sizeClasses = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-6xl',
  xl: 'text-8xl',
}

export const PrimaryLogo: React.FC<PrimaryLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'default',
}) => {
  const colorStyle =
    variant === 'white'
      ? { color: 'white', fontFamily: 'system-ui, -apple-system, sans-serif' }
      : { color: 'oklch(0.572 0.1207 315.544)', fontFamily: 'system-ui, -apple-system, sans-serif' }

  return (
    <span
      className={`${sizeClasses[size]} font-bold tracking-tight ${className}`}
      style={colorStyle}
    >
      Agelum
    </span>
  )
}
