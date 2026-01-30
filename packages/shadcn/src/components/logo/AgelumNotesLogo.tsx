import React from 'react'
import { DerivedLogo } from './DerivedLogo'

interface AgelumNotesLogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  layout?: 'vertical' | 'horizontal'
}

export const AgelumNotesLogo: React.FC<AgelumNotesLogoProps> = (props) => {
  return <DerivedLogo secondaryText="notes" {...props} />
}
