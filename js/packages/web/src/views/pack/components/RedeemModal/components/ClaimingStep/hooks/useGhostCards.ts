import { useMemo } from 'react';
import { usePack } from '../../../../../contexts/PackContext';

const DEFAULT_GHOST_CARDS_NUMBER = 3;

export const useGhostCards = (currentCardIndex: number): number[] => {
  const { pack } = usePack();

  const { allowedAmountToRedeem = 0 } = pack?.info || {};
  const cardsLeftToOpen = Math.max(
    allowedAmountToRedeem - currentCardIndex - 1,
    0,
  );
  const arraySize = Math.min(cardsLeftToOpen, DEFAULT_GHOST_CARDS_NUMBER);

  return useMemo(() => Array.from({ length: arraySize }), [arraySize]);
};
