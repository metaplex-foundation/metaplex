import React, { FC } from 'react'
import CN from 'classnames'

export interface BadgeProps {
  [x: string]: any
  appearance?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  iconBefore?: any
  iconAfter?: any
}

export const Badge: FC<BadgeProps> = ({
  className,
  children,
  appearance,
  iconBefore,
  iconAfter,
  ...restProps
}: BadgeProps) => {
  const BadgeClasses = CN(
    `badge px-[12px] py-[2px] rounded-full text-sm font-500 inline-flex items-center justify-center gap-[6px]`,
    className,
    {
      'bg-slate-200': !appearance,
      'bg-green-200 text-green-700': appearance === 'success',
      'bg-purple-200 text-purple-700': appearance === 'secondary',
      'bg-blue-200 text-blue-700': appearance === 'primary',
      'bg-orange-200 text-orange-700': appearance === 'warning',
      'bg-red-200 text-red-700': appearance === 'danger',
    }
  )

  return (
    <div className={BadgeClasses} {...restProps}>
      {iconBefore && <span className='inline-flex'>{iconBefore}</span>}
      <span className='inline-flex'>{children}</span>
      {iconAfter && <span className='inline-flex'>{iconAfter}</span>}
    </div>
  )
}

export default Badge
