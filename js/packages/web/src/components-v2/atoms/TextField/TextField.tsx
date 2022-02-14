import React, { FC, forwardRef } from 'react';
import CN from 'classnames';

export interface TextFieldProps {
  [x: string]: any;
  appearance?: 'default' | 'success' | 'warning' | 'danger';
  className?: string | undefined;
  disabled?: boolean;
  hint?: string | undefined;
  hintClassName?: string | undefined;
  iconAfter?: any;
  iconBefore?: any;
  isError?: boolean;
  isSuccess?: boolean;
  label?: string;
  onClickIcon?: any;
  onClickIconAfter?: any;
  onClickIconBefore?: any;
  readOnly?: boolean;
  required?: boolean;
  size?: 'default' | 'lg' | 'sm';
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
    | 'week';
  wrapperClassName?: string | undefined;
}

export const TextField: FC<TextFieldProps> = forwardRef(
  (
    {
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
    ref: any,
  ) => {
    /* Background Color */
    const wrapperBGColor =
      (!disabled && 'bg-white') || (disabled && 'bg-gray-50');

    /* Border Color */
    const wrapperBorderColor =
      (!disabled &&
        !isError &&
        'outline-none focus-within:!border-blue-400 focus-within:shadow-[0px_0px_0px_1px_#60a5fa]') ||
      (disabled && 'border-gray-200') ||
      (!disabled && isError && '!border-R-100 focus-within:!border-B-400');

    /* Text Color */
    const inputTextColor =
      (!disabled && 'text-gray-800') || (disabled && 'text-gray-400');

    /* Inner Input Field */
    const TextFieldClasses = CN('text-field', className, inputTextColor, {
      /* Input Field Common */
      'appearance-none h-full w-full outline-none text-md font-400 flex items-center bg-[transparent] placeholder:text-gray-500 placeholder:font-400':
        true,

      /* Disabled */
      'cursor-not-allowed': disabled,

      /* If has Icons */
      'pr-[16px]': iconBefore,
      'pl-[16px]': iconAfter,
      'px-[16px]': !iconAfter && !iconBefore,
      '!px-[0]': iconAfter && iconBefore,
    });

    /* Wrapper */
    const TextFieldWrapperClasses = CN(
      wrapperClassName,
      wrapperBGColor,
      wrapperBorderColor,
      {
        /* Input Field Wrapper Common */
        'border border-gray-300 hover:border-gray-400/60 flex items-center rounded-[6px] w-full group ease-in-out duration-[50] relative z-[0] transition-all':
          true,
        'mt-[11px]': label,
        'h-[46px]': size === 'default' || !size,
        'h-[60px]': size === 'lg',
        'h-[40px]': size === 'sm',
      },
    );

    return (
      <div className="flex flex-col w-full text-field__container">
        <div className={TextFieldWrapperClasses}>
          {label && (
            <label
              className={CN(
                'absolute !text-sm text-gray-700 text-field__label top-[-11px] left-[12px] px-[4px] after:content-[""] after:absolute after:left-0 after:right-0 after:h-[9px] after:bottom-[2px] after:z-[0]',
                {
                  'after:bg-white': !disabled,
                  'after:bg-gray-50': disabled,
                },
              )}
            >
              <span className="relative z-[1]">
                {label} {required && <span className="text-R-400">*</span>}
              </span>
            </label>
          )}

          {iconBefore && (
            <div
              className={CN(
                'text-field__icon flex items-center pl-[16px] pr-[12px] h-full',
              )}
              onClick={onClickIconBefore || onClickIcon}
              onKeyDown={onClickIconBefore || onClickIcon}
              role="button"
              tabIndex={0}
            >
              {iconBefore}
            </div>
          )}

          <input
            className={TextFieldClasses}
            disabled={disabled}
            readOnly={readOnly}
            ref={ref}
            type={type}
            {...restProps}
          />

          {iconAfter && (
            <div
              className={CN(
                'text-field__icon flex items-center pr-[16px] pl-[12px] h-full',
              )}
              onClick={onClickIconAfter || onClickIcon}
              onKeyDown={onClickIconAfter || onClickIcon}
              role="button"
              tabIndex={0}
            >
              {iconAfter}
            </div>
          )}
        </div>

        {hint && (
          <span
            className={CN('text-sm pt-[2px]', hintClassName, {
              'text-R-400': isError,
              'text-G-500': isSuccess,
            })}
          >
            {hint}
          </span>
        )}
      </div>
    );
  },
);

TextField.defaultProps = {
  className: undefined,
  disabled: false,
  iconAfter: undefined,
  iconBefore: undefined,
  label: undefined,
  onClickIconAfter: undefined,
  onClickIconBefore: undefined,
  readOnly: false,
  size: 'default',
  type: 'text',
  wrapperClassName: undefined,
};

export default TextField;
