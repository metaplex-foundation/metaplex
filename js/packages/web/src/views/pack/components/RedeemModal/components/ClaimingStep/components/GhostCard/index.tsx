import React, { useMemo } from 'react';

import { CARDS_DISTANCE } from '../../constants';

export const GHOST_CARD_WIDTH = 308;
export const WIDTH_DIFF = 46;

const GhostCard = ({ index }: { index: number }) => {
  const stylesGhostCard = useMemo(() => {
    return {
      height: `${GHOST_CARD_WIDTH - index * WIDTH_DIFF}px`,
      width: `${GHOST_CARD_WIDTH - index * WIDTH_DIFF}px`,
      top: `calc(100% - ${(index + 1) * CARDS_DISTANCE}px)`,
    };
  }, [index]);

  return <div className="claiming-step__card" style={stylesGhostCard} />;
};

export default GhostCard;
