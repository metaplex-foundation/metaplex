import React, { forwardRef, ReactNode } from 'react'
import CN from 'classnames'

export interface ButtonProps {
  [x: string]: any
  appearance?:
    | 'primary'
    | 'secondary'
    | 'neutral'
    | 'ghost'
    | 'ghost-invert'
    | 'link'
    | 'link-invert'
  children?: any
  className?: string
  disabled?: boolean
  icon?: ReactNode | string | number
  iconAfter?: ReactNode | string | number
  iconBefore?: ReactNode | string | number
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  view?: 'outline' | 'solid'
  isSquare?: boolean
  isRounded?: boolean
  isActive?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      appearance,
      children,
      className,
      disabled,
      icon,
      iconAfter,
      iconBefore,
      size,
      view,
      isSquare,
      isRounded,
      ...restProps
    }: ButtonProps,
    ref: any
  ) => {
    /* General */
    const ButtonClasses = CN(
      'btn uppercase font-serif flex items-center justify-center group transition-all gap-[8px] children:inline-flex children:items-center box-border outline-none',
      className,
      {
        /* Rounded */
        'rounded-full': isRounded,
        'rounded-[4px]': !isRounded,

        /* Sizing */
        'h-[24px] px-[8px] text-xs font-700': size === 'xs',
        'h-[32px] px-[16px] text-sm font-600': size === 'sm',
        'h-[40px] px-[20px] text-sm font-600': size === 'md',
        'h-[56px] px-[24px] text-md font-600': size === 'lg',
        'h-[80px] px-[60px] text-base font-600': size === 'xl',

        '!px-[0] !text-md': appearance === 'link' || appearance === 'link-invert',

        '!px-[0] w-[38px]': isSquare && size === 'sm',
        '!px-[0] w-[48px]': isSquare && size === 'md',
        '!px-[0] w-[52px]': isSquare && size === 'lg',
        '!px-[0] w-[62px]': isSquare && size === 'xl',

        /* Appearance */
        'bg-gradient-to-r from-B-400 to-P-400 text-white hover:from-B-500 hover:from-P-500':
          appearance === 'primary' && view === 'solid' && !disabled,
        'bg-slate-50 text-slate-900 hover:bg-slate-300':
          appearance === 'secondary' && view === 'solid' && !disabled,
        'bg-slate-900 text-white hover:bg-slate-800':
          appearance === 'neutral' && view === 'solid' && !disabled,

        'bg-transparent !text-slate-900 hover:!text-B-400 normal-case !font-sans !font-500':
          appearance === 'link',
        'bg-transparent text-white hover:text-slate-200 focus:!shadow-none':
          appearance === 'link-invert',

        'bg-transparent text-slate-900 hover:bg-slate-50':
          appearance === 'ghost' && view === 'solid' && !disabled,
        'bg-transparent text-white hover:text-B-base':
          appearance === 'ghost-invert' && view === 'solid' && !disabled,

        /* View */
        'bg-transparent text-slate-900 border-slate-900':
          appearance === 'primary' && view === 'outline' && !disabled,
        'border bg-slate-50 hover:bg-slate-50 border-slate-300':
          appearance === 'secondary' && view === 'outline' && !disabled,
        'bg-transparent text-slate-900 !border-slate-900':
          appearance === 'neutral' && view === 'outline' && !disabled,
        'bg-white text-slate-900 border border-slate-300 hover:border-slate-900':
          appearance === 'ghost' && view === 'outline' && !disabled,
        'bg-transparent text-white hover:border-white':
          appearance === 'ghost-invert' && view === 'outline' && !disabled,

        /* Outline */
        'focus:!shadow-[0px_0px_0px_2px_#040D1F]': view == 'solid' && appearance !== 'link',
        'focus:!border-slate-700 focus:!shadow-[0px_0px_0px_1px_#040D1F]':
          view == 'outline' && appearance !== 'link',

        /* Disabled */
        '!bg-slate-100 pointer-events-none select-none cursor-not-allowed': disabled,
      }
    )

    return (
      <button className={CN(ButtonClasses)} disabled={disabled} ref={ref} {...restProps}>
        {iconBefore && <div className={CN('btn__icon children:inline-flex')}>{iconBefore}</div>}
        {!children && icon && <div className={CN('btn__content')}>{icon}</div>}
        {children && <div className={CN('btn__content')}>{children}</div>}
        {iconAfter && <div className={CN('btn__icon children:inline-flex')}>{iconAfter}</div>}
      </button>
    )
  }
)

Button.defaultProps = {
  appearance: 'primary',
  className: undefined,
  disabled: false,
  isRounded: true,
  iconAfter: undefined,
  iconBefore: undefined,
  size: 'md',
  view: 'solid',
}

export default Button
