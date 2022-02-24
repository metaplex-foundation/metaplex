import React, { FC } from 'react'
import CN from 'classnames'

export interface ButtonProps {
  [x: string]: any
  view?: 'outline' | 'solid'
  appearance?: 'primary' | 'complimentary' | 'secondary' | 'ghost' | 'ghost-invert'
  children?: any
  iconAfter?: any
  iconBefore?: any
  onClick?: any
  isRounded?: boolean
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export const Button: FC<ButtonProps> = ({
  view,
  children,
  className,
  iconAfter,
  iconBefore,
  onClick,
  size,
  appearance,
  isRounded,
  ...restProps
}: ButtonProps) => {
  const ButtonClasses = CN(
    `button rounded-[6px] inline-flex items-center justify-center font-500 border-2 border-transparent transition-colors gap-[8px] select-none`,
    className,
    {
      'h-[30px] px-[12px] text-sm': size === 'sm',
      'h-[38px] px-[12px] text-base': size === 'md',
      'h-[42px] px-[16px]': size === 'lg',
      'h-[52px] px-[16px]': size === 'xl',
      'bg-white': view === 'outline',

      '!rounded-full': isRounded,

      'border-B-400 hover:bg-B-400 hover:text-white':
        view === 'outline' && appearance === 'primary',

      'border-gray-500 hover:bg-gray-500 hover:text-white':
        view === 'outline' && appearance === 'secondary',

      'border-gray-600 bg-transparent text-gray-600 hover:bg-gray-500 hover:text-white':
        view === 'outline' && appearance === 'ghost',

      'border-white bg-transparent text-white hover:bg-white hover:text-gray-600':
        view === 'outline' && appearance === 'ghost-invert',

      'bg-B-400 text-white hover:bg-B-500 hover:text-white':
        view === 'solid' && appearance === 'primary',

      'bg-gray-500 text-white hover:bg-gray-600': view === 'solid' && appearance === 'secondary',

      'bg-white text-gray-800 hover:bg-B-400 hover:text-white':
        view === 'solid' && appearance === 'ghost',

      'bg-white text-B-400 hover:bg-B-400 hover:text-white':
        view === 'solid' && appearance === 'ghost-invert',

      'bg-P-400 hover:bg-P-500 text-white bg-no-repeat bg-center bg-cover':
        view === 'solid' && appearance === 'complimentary',
    }
  )

  return (
    <button className={ButtonClasses} {...restProps} onClick={onClick}>
      {iconBefore && <span className='icon-before'>{iconBefore}</span>}
      <div className='content flex items-center'>
        {typeof children === 'function' && children({ onClick })}
        {typeof children !== 'function' && children}
      </div>
      {iconAfter && <span className='icon-after'>{iconAfter}</span>}
    </button>
  )
}

Button.defaultProps = {
  size: 'md',
  view: 'solid',
  appearance: 'primary',
}

export default Button
