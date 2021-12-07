import React, { useMemo } from 'react';
import { cardDistance, widthDiff, widthGhostCard } from "../constants";

const GhostCard = ({ index }: { index: number }) => {

  const stylesGhostCard = useMemo(() => {
    return {
      height: `${widthGhostCard - index * widthDiff}px`,
      width: `${widthGhostCard - index * widthDiff}px`,
      top: `calc(100% - ${(index + 1) * cardDistance}px)`,
    }
  }, [index])

  return <div className="redeem-card" style={stylesGhostCard} />
}

export default GhostCard;
