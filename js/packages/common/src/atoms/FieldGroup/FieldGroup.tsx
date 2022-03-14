import React, { FC } from 'react'
import CN from 'classnames'

import { Button } from '../Button'
import { TextField } from '../TextField'

export interface FieldGroupProps {
  [x: string]: any
  btnProps?: any
  inputProps?: any
  bgClassName?: string
}

export const FieldGroup: FC<FieldGroupProps> = ({
  btnProps,
  className,
  inputProps,
  bgClassName,
  ...restProps
}: FieldGroupProps) => {
  const FieldGroupClasses = CN(`field-group flex`, className)
  const { children: btnChildren, className: btnClassName, ...restBtnProps } = btnProps

  return (
    <div className={FieldGroupClasses} {...restProps}>
      <TextField
        wrapperClassName={CN(
          'rounded-tr-none rounded-br-none rounded-l-[50px] border-r-0 border-N-50', bgClassName,
          inputProps?.wrapperClassName
        )}
        {...inputProps}
      />
      <Button className={CN('rounded-l-[50px]', btnClassName)} {...restBtnProps}>
        {btnChildren || 'Submit'}
      </Button>
    </div>
  )
}

FieldGroup.defaultProps = {}

export default FieldGroup
