import React, { FC, ReactNode } from 'react'
import CN from 'classnames'
import { BlinkIndicator } from '..'

export interface TagProps {
  [x: string]: any
  children?: ReactNode | string | number | undefined
  className?: string | undefined
  appearance?: 'default' | 'success' | 'warning' | 'danger' | 'info'
  onClick?: any
  hasIndicator?: boolean
}

export const Tag: FC<TagProps> = ({ children, className, appearance, onClick, hasIndicator, ...restProps }: TagProps) => {
  const TagClasses = CN(`tag flex items-center px-[12px] rounded-[22px] overflow-hidden text-sm text-N-800 font-600 h-[28px] gap-[8px]`, className, {
    /* Extra */
    'cursor-pointer': onClick,

    /* Appearance */
    'bg-N-100': appearance === 'default',
    'bg-R-10': appearance === 'danger',
    'bg-G-10': appearance === 'success',
    'bg-Y-10': appearance === 'warning',
  })

  return (
    <div className={TagClasses} onClick={onClick} {...restProps}>
      {hasIndicator && <BlinkIndicator appearance={appearance} />}
      <span className='flex h-full items-center'>{children}</span>
    </div>
  )
}

Tag.defaultProps = {
  children: 'Tag',
  appearance: 'default',
  onClick: undefined,
}

export default Tag
