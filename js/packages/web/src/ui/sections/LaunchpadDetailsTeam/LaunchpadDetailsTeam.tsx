import React, { FC } from 'react'
import CN from 'classnames'

export interface LaunchpadDetailsTeamProps {
  [x: string]: any
}

export const LaunchpadDetailsTeam: FC<LaunchpadDetailsTeamProps> = ({
  className,
  ...restProps
}: LaunchpadDetailsTeamProps) => {
  const LaunchpadDetailsTeamClasses = CN(
    `launchpad-details-team prose max-w-full w-full`,
    className
  )

  return (
    <div className={LaunchpadDetailsTeamClasses} {...restProps}>
      Lorem ipsum dolor, sit amet consectetur adipisicing elit. Perferendis at soluta iusto
      deleniti, excepturi hic sed qui, deserunt voluptatibus perspiciatis in, non minima optio
      accusamus aliquid? Eius porro sapiente quis.
    </div>
  )
}

LaunchpadDetailsTeam.defaultProps = {}

export default LaunchpadDetailsTeam
