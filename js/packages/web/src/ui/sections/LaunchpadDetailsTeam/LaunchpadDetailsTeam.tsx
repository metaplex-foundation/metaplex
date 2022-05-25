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
      {restProps.discription ? restProps.discription : null}
    </div>
  )
}

LaunchpadDetailsTeam.defaultProps = {}

export default LaunchpadDetailsTeam
