import React, { FC, SVGProps } from 'react'
import CN from 'classnames'

interface SpinnerProps extends SVGProps<SVGSVGElement> {
  size?: number
  color?: string
}

export const Spinner: FC<SpinnerProps> = ({
  className,
  size,
  color,
  ...restProps
}: SpinnerProps) => {
  const SpinnerClasses = CN('spinner', className, {})

  return (
    <div className={SpinnerClasses}>
      <svg
        focusable='false'
        height={size}
        width={size}
        viewBox='0 0 16 16'
        xmlns='http://www.w3.org/2000/svg'
        className='spinner__svg'
        color={color}
        {...restProps}>
        <circle cx='8' cy='8' r='7' className='spinner__svg__circle' />
      </svg>
    </div>
  )
}

Spinner.defaultProps = {
  size: 48,
  color: undefined,
}

export default Spinner
