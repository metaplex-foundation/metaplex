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
      Lorem ipsum dolor, sit amet consectetur adipisicing elit. Perferendis at soluta iusto
      deleniti, excepturi hic sed qui, deserunt voluptatibus perspiciatis in, non minima optio
      accusamus aliquid? Eius porro sapiente quis.
    </div>
  )
}

LaunchpadDetailsRoadMap.defaultProps = {}

export default LaunchpadDetailsRoadMap
