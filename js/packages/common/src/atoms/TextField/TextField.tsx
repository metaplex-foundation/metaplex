import React, { FC, forwardRef, useState } from 'react'
import CN from 'classnames'

export interface TextFieldProps {
  [x: string]: any
  appearance?: 'default' | 'success' | 'warning' | 'danger'
  className?: string | undefined
  disabled?: boolean
  hint?: string | undefined
  hintClassName?: string | undefined
  iconAfter?: any
  iconBefore?: any
  isError?: boolean
  isSuccess?: boolean
  label?: string
  onClickIcon?: any
  onClickIconAfter?: any
  onClickIconBefore?: any
  readOnly?: boolean
  required?: boolean
  size?: 'md' | 'lg' | 'sm'
  type?:
    | 'text'
    | 'date'
    | 'datetime-local'
    | 'email'
    | 'month'
    | 'number'
    | 'password'
    | 'search'
    | 'tel'
    | 'time'
    | 'url'
    | 'week'
  wrapperClassName?: string | undefined
}

export const TextField: FC<TextFieldProps> = forwardRef(
  (
    {
      appearance,
      className,
      disabled,
      hint,
      hintClassName,
      iconAfter,
      iconBefore,
      isError,
      isSuccess,
      label,
      onClickIcon,
      onClickIconAfter,
      onClickIconBefore,
      readOnly,
      required,
      size,
      type,
      wrapperClassName,
      ...restProps
    }: TextFieldProps,
    ref: any
  ) => {
    const [inputType, setInputType] = useState(type)

    /* Background Color */
    const wrapperBGColor = (!disabled && 'bg-white') || (disabled && 'bg-N-50')

    /* Border Color */
    const wrapperBorderColor =
      (!disabled &&
        !isError &&
        'border-N-300 outline-none focus-within:border-N-700 focus-within:shadow-[inset_0px_0px_0px_1px_#040D1F]') ||
      (disabled && 'border-N-200') ||
      (!disabled &&
        isError &&
        '!border-R-100 focus-within:!border-N-700 focus-within:!shadow-[0px_0px_0px_1px_#040D1F]')

    /* Text Color */
    const inputTextColor = (!disabled && 'text-N-800') || (disabled && 'text-N-400')

    /* Inner Input Field */
    const TextFieldClasses = CN('text-field', className, inputTextColor, {
      /* Input Field Common */
      'appearance-none h-full w-full outline-none text-md font-400 flex items-center bg-[transparent] placeholder:text-N-300':
        true,

      /* Disabled */
      'cursor-not-allowed': disabled,

      /* If has Icons */
      'pr-[16px]': iconBefore,
      'pl-[16px]': iconAfter,
      'px-[16px]': !iconAfter && !iconBefore,
      '!px-[0]': iconAfter && iconBefore,
    })

    /* Wrapper */
    const TextFieldWrapperClasses = CN(wrapperClassName, wrapperBGColor, wrapperBorderColor, {
      /* Input Field Wrapper Common */
      'border flex items-center rounded-[4px] w-full group ease-in-out duration-[50] relative z-[0]':
        true,
      'mt-[11px]': label,
      'h-[40px]': size === 'md' || !size,
      'h-[60px]': size === 'lg',
      'h-[32px]': size === 'sm',
    })

    return (
      <div className='text-field__container flex w-full flex-col'>
        <div className={TextFieldWrapperClasses}>
          {label && (
            <label
              className={CN(
                'text-field__label text-N-700 absolute top-[-11px] left-[12px] px-[4px] !text-sm after:absolute after:left-0 after:right-0 after:bottom-[2px] after:z-[0] after:h-[9px] after:content-[""]',
                {
                  'after:bg-white': !disabled,
                  'after:bg-N-50': disabled,
                }
              )}>
              <span className='relative z-[1]'>
                {label} {required && <span className='text-R-400'>*</span>}
              </span>
            </label>
          )}

          {iconBefore && (
            <div
              className={CN('text-field__icon flex h-full items-center pl-[16px] pr-[12px]')}
              onClick={onClickIconBefore || onClickIcon}
              onKeyDown={onClickIconBefore || onClickIcon}
              role='button'
              tabIndex={0}>
              {iconBefore}
            </div>
          )}

          <input
            className={TextFieldClasses}
            disabled={disabled}
            readOnly={readOnly}
            ref={ref}
            type={inputType}
            {...restProps}
          />

          {type === 'password' && (
            <div
              className={CN(
                'text-field__icon text-N-500 flex h-full items-center pr-[16px] pl-[12px]'
              )}
              onClick={() => setInputType(prev => (prev === 'password' ? 'text' : 'password'))}
              role='button'
              tabIndex={0}>
              {inputType === 'password' ? (
                <i className='ri-eye-line text-[16px]' />
              ) : (
                <i className='ri-eye-off-line text-[16px]' />
              )}
            </div>
          )}

          {iconAfter && (
            <div
              className={CN('text-field__icon flex h-full items-center pr-[16px] pl-[12px]')}
              onClick={onClickIconAfter || onClickIcon}
              onKeyDown={onClickIconAfter || onClickIcon}
              role='button'
              tabIndex={0}>
              {iconAfter}
            </div>
          )}
        </div>

        {hint && (
          <span
            className={CN('pt-[2px] text-sm', hintClassName, {
              'text-R-400': isError,
              'text-G-500': isSuccess,
            })}>
            {hint}
          </span>
        )}
      </div>
    )
  }
)

TextField.defaultProps = {
  appearance: 'default',
  className: undefined,
  disabled: false,
  iconAfter: undefined,
  iconBefore: undefined,
  label: undefined,
  onClickIconAfter: undefined,
  onClickIconBefore: undefined,
  readOnly: false,
  size: 'md',
  type: 'text',
  wrapperClassName: undefined,
}

export default TextField
