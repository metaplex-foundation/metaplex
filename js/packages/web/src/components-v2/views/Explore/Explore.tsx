import React, { FC } from 'react'
import { ExploreCollections } from '../../sections/ExploreCollections'

export interface ExploreProps {
  [x: string]: any
}

export const Explore: FC<ExploreProps> = () => {
  return <ExploreCollections />
}

export default Explore
