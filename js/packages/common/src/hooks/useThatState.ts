import { useState } from 'react';

// Extends useState() hook with async getThatState getter which can be used to get state value in contexts (ex. async callbacks) where up to date state is not available
export function useThatState<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const getThatState = () =>
    new Promise<T>(resolve => {
      // Use NOP setState call to retrieve current state value
      setState(s => {
        resolve(s);
        return s;
      });
    });

  return [state, setState, getThatState] as const;
}
