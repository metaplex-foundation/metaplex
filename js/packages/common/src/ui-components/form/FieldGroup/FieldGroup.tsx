import React, { FC } from 'react'
import CN from 'classnames'

import { Button } from '../../../atoms'
import { TextField } from '../TextField'

export interface FieldGroupProps {
  [x: string]: any
  btnProps?: any
  inputProps?: any
  placeholder?: string
}

export const FieldGroup: FC<FieldGroupProps> = ({
  btnProps,
  className,
  inputProps,
  placeholder,
  ...restProps
}: FieldGroupProps) => {
  const FieldGroupClasses = CN(`field-group flex`, className, {})
  const {
    onClick: btnOnClick,
    appearance: btnAppearance,
    label: btnLabel,
    className: btnClassName,
    ...restBtnProps
  } = btnProps

  return (
    <div className={FieldGroupClasses} {...restProps}>
      <TextField
        placeholder={placeholder}
        wrapperClassName={CN(
          'rounded-tr-none rounded-br-none border-r-0',
          inputProps?.wrapperClassName
        )}
        {...inputProps}
      />
      <Button
        size='md'
        className={CN('rounded-tl-none rounded-bl-none', btnClassName)}
        onClick={btnOnClick}
        appearance={btnAppearance}
        {...restBtnProps}
      >
        {btnLabel || 'Submit'}
      </Button>
    </div>
  )
}

FieldGroup.defaultProps = {}

export default FieldGroup
