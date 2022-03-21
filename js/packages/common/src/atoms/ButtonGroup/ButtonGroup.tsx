import React, { FC } from 'react'
import CN from 'classnames'
import { ButtonProps } from '../Button'
import { BlinkIndicator } from '../BlinkIndicator'

export interface ButtonGroupProps {
  [x: string]: any
  buttons: ButtonProps[]
  appearance?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}

export const ButtonGroup: FC<ButtonGroupProps> = ({
  className,
  appearance,
  buttons,
  ...restProps
}: ButtonGroupProps) => {
  const ButtonGroupClasses = CN(
    `button-group border border-transparent flex items-center gap-[24px] h-[40px] px-[28px] rounded-full`,
    className,
    {
      /* Appearance */
      'bg-slate-100 border-slate-900': appearance === 'default',
      'bg-R-10 border-R-800': appearance === 'danger',
      'bg-G-10 border-G-800': appearance === 'success',
      'bg-Y-10 border-Y-800': appearance === 'warning',
    }
  )

  return (
    <div className={ButtonGroupClasses} {...restProps}>
      {buttons.map(({ label, onClick, isActive, hasIndicator }: ButtonProps, index: number) => (
        <div key={index} className='flex items-center gap-[24px]'>
          <button
            className={CN(
              'font-500 flex h-full items-center gap-[8px] font-serif text-sm uppercase',
              {
                '!font-600': isActive,
              }
            )}
            onClick={onClick}>
            {hasIndicator && <BlinkIndicator appearance='danger' />}
            <span className='flex h-full items-center leading-normal'>{label}</span>
          </button>
          {index + 1 !== buttons.length && <span className='h-[24px] w-[1px] bg-slate-500' />}
        </div>
      ))}
    </div>
  )
}

ButtonGroup.defaultProps = {
  appearance: 'warning',
}

export default ButtonGroup
