import React, { FC } from 'react'
import CN from 'classnames'

export interface BlinkIndicatorProps {
  [x: string]: any
  appearance?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export const BlinkIndicator: FC<BlinkIndicatorProps> = ({ className, appearance, ...restProps }: BlinkIndicatorProps) => {
  const BlinkIndicatorClasses = CN('blink-indicator inline-flex h-[8px] w-[8px] flex-shrink-0 rounded-full relative')
  const ColorDotClasses = CN('blink-indicator-color', {
    'bg-N-500': appearance === 'default',
    'bg-R-500': appearance === 'danger',
    'bg-G-500': appearance === 'success',
    'bg-Y-500': appearance === 'warning',
    'bg-P-500': appearance === 'info',
  })

  const ColorRippleClasses = CN('blink-indicator-color', {
    'bg-N-400': appearance === 'default',
    'bg-R-400': appearance === 'danger',
    'bg-G-400': appearance === 'success',
    'bg-Y-400': appearance === 'warning',
    'bg-P-400': appearance === 'info',
  })

  return (
    <span className={BlinkIndicatorClasses} {...restProps}>
      <span className={CN('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', ColorRippleClasses)} />
      <span className={CN('relative inline-flex h-[8px] w-[8px] rounded-full', ColorDotClasses)}></span>
    </span>
  )
}

BlinkIndicator.defaultProps = {
  appearance: 'danger',
}

export default BlinkIndicator
