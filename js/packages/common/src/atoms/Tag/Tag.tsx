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
  isRounded?: boolean
  size?: 'sm' | 'md' | 'lg'
  iconAfter?: ReactNode | string | number
}

export const Tag: FC<TagProps> = ({
  children,
  className,
  appearance,
  onClick,
  hasIndicator,
  isRounded,
  size,
  iconAfter,
  ...restProps
}: TagProps) => {
  const TagClasses = CN(
    `tag flex items-center px-[12px] overflow-hidden text-sm text-slate-900 font-600 gap-[8px]`,
    className,
    {
      /* Extra */
      'cursor-pointer': onClick,

      /* Rounded */
      'rounded-full': isRounded,
      'rounded-[4px]': !isRounded,

      /* Size */
      'h-[20px] text-xs': size === 'sm',
      'h-[24px]': size === 'md',
      'h-[32px]': size === 'lg',

      /* Appearance */
      'bg-slate-100': appearance === 'default',
      'bg-R-10': appearance === 'danger',
      'bg-G-10': appearance === 'success',
      'bg-Y-10': appearance === 'warning',
    }
  )

  return (
    <div className={TagClasses} onClick={onClick} {...restProps}>
      {hasIndicator && <BlinkIndicator appearance={appearance} />}
      <span className='flex h-full w-full items-center justify-center'>{children}</span>
      {iconAfter && (
        <span className='icon font-400 flex items-center text-slate-900'>{iconAfter}</span>
      )}
    </div>
  )
}

Tag.defaultProps = {
  children: 'Tag',
  appearance: 'default',
  onClick: undefined,
  size: 'md',
  isRounded: true,
}

export default Tag
