import React, { FC } from 'react'
import CN from 'classnames'

export interface QuickDonateProps {
  [x: string]: any
}

export const QuickDonate: FC<QuickDonateProps> = ({
  className,
  ...restProps
}: QuickDonateProps) => {
  const QuickDonateClasses = CN(`quick-donate`, className)

  return (
    <div className={QuickDonateClasses} {...restProps}>
      <img src='/img/donation-dummy.png' />
    </div>
  )
}

QuickDonate.defaultProps = {}

export default QuickDonate
