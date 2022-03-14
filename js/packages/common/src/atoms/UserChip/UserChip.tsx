import React, { FC } from 'react'
import CN from 'classnames'

export interface UserChipProps {
  [x: string]: any
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  children?: any
  avatar?: any
  iconAfter?: any
  onClick?: any
}

export const UserChip: FC<UserChipProps> = ({
  className,
  size,
  children,
  avatar,
  iconAfter,
  onClick,
  ...restProps
}: UserChipProps) => {
  const UserChipClasses = CN(
    `user-chip bg-white rounded-full flex items-center border border-N-300 gap-[8px] children:flex children:items-center transition-all`,
    className,
    {
      /* Spacing */
      'pl-[4px] pr-[12px]': avatar && iconAfter,
      'pl-[4px] pr-[4px]': !iconAfter && avatar,
      'px-[12px]': !avatar && !iconAfter,

      /* Sizing */
      'h-[24px] text-xs': size === 'xs',
      'h-[38px] text-sm': size === 'sm',
      'h-[40px] text-md': size === 'md',
      'h-[60px] text-base': size === 'lg',
      'h-[80px] text-base': size === 'xl',

      /* Misc */
      'cursor-pointer hover:border-N-800': onClick,
    }
  )

  return (
    <div className={UserChipClasses} {...restProps}>
      {avatar && <div className='user-chip__avatar'>{avatar}</div>}
      <div className='user-chip__content font-500'>{children}</div>
      {iconAfter && <div className='user-chip__icon-after'>{iconAfter}</div>}
    </div>
  )
}

UserChip.defaultProps = {
  size: 'md',
}

export default UserChip
