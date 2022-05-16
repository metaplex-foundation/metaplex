import React, { FC } from 'react'
import CN from 'classnames'

export interface LaunchpadDetailsAboutProps {
  [x: string]: any
}

export const LaunchpadDetailsAbout: FC<LaunchpadDetailsAboutProps> = ({
  className,
  ...restProps
}: LaunchpadDetailsAboutProps) => {
  const LaunchpadDetailsAboutClasses = CN(
    `launchpad-details-about w-full max-w-full prose`,
    className
  )

  return (
    <div className={LaunchpadDetailsAboutClasses} {...restProps}>
      <p className='text-base text-gray-700'>
        {restProps.discription ? restProps.discription : null}
      </p>
    </div>
  )
}

LaunchpadDetailsAbout.defaultProps = {}

export default LaunchpadDetailsAbout
