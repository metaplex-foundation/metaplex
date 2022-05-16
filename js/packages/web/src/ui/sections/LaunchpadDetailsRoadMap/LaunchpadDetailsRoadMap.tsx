import React, { FC } from 'react'
import CN from 'classnames'

export interface LaunchpadDetailsRoadMapProps {
  [x: string]: any
}

export const LaunchpadDetailsRoadMap: FC<LaunchpadDetailsRoadMapProps> = ({
  className,
  ...restProps
}: LaunchpadDetailsRoadMapProps) => {
  const LaunchpadDetailsRoadMapClasses = CN(
    `launchpad-details-road-map max-w-full prose w-full`,
    className
  )

  return (
    <div className={LaunchpadDetailsRoadMapClasses} {...restProps}>
      {restProps.discription ? restProps.discription : null}
    </div>
  )
}

LaunchpadDetailsRoadMap.defaultProps = {}

export default LaunchpadDetailsRoadMap
