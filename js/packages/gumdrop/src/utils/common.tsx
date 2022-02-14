import React from 'react';
import { notification } from 'antd';
// import Link from '../components/Link';

type UseStorageReturnValue = {
  getItem: (key: string) => string;
  setItem: (key: string, value: string) => boolean;
  removeItem: (key: string) => void;
};

export const useLocalStorage = (): UseStorageReturnValue => {
  const isBrowser: boolean = ((): boolean => typeof window !== 'undefined')();

  const getItem = (key: string): string => {
    return isBrowser ? window.localStorage[key] : '';
  };

  const setItem = (key: string, value: string): boolean => {
    if (isBrowser) {
      window.localStorage.setItem(key, value);
      return true;
    }

    return false;
  };

  const removeItem = (key: string): void => {
    window.localStorage.removeItem(key);
  };

  return {
    getItem,
    setItem,
    removeItem,
  };
};

export function useLocalStorageState<T>(
  key: string,
  defaultState?: T,
): [T, (key: T) => void] {
  const localStorage = useLocalStorage();
  const [state, setState] = React.useState(() => {
    console.debug('Querying local storage', key);
    const storedState = localStorage.getItem(key);
    console.debug('Retrieved local storage', storedState);
    if (storedState) {
      return JSON.parse(storedState);
    }
    return defaultState;
  });

  const setLocalStorageState = React.useCallback(
    newState => {
      const changed = state !== newState;
      if (!changed) {
        return;
      }
      setState(newState);
      if (newState === null) {
        localStorage.removeItem(key);
      } else {
        try {
          localStorage.setItem(key, JSON.stringify(newState));
        } catch {
          // ignore
        }
      }
    },
    [state, key],
  );

  return [state, setLocalStorageState];
}

export function notify({
  message = '',
  description = undefined as any,
  txid = '',
  type = 'info',
  placement = 'bottomLeft',
}) {
  if (txid) {
    //   <Link
    //     external
    //     to={'https://explorer.solana.com/tx/' + txid}
    //     style={{ color: '#0000ff' }}
    //   >
    //     View transaction {txid.slice(0, 8)}...{txid.slice(txid.length - 8)}
    //   </Link>

    description = <></>;
  }
  (notification as any)[type]({
    message: <span style={{ color: 'black' }}>{message}</span>,
    description: (
      <span style={{ color: 'black', opacity: 0.5 }}>{description}</span>
    ),
    placement,
    style: {
      backgroundColor: 'white',
    },
  });
}

// shorten the checksummed version of the input address to have 4 characters at start and end
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export const formatUSD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const numberFormater = new Intl.NumberFormat('en-US', {
  style: 'decimal',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatNumber = {
  format: (val?: number) => {
    if (!val) {
      return '--';
    }

    return numberFormater.format(val);
  },
};

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function chunks<T>(array: T[], size: number): T[][] {
  return Array.apply(
    0,
    new Array(Math.ceil(array.length / size)),
  ).map((_: T, index: number) => array.slice(index * size, (index + 1) * size));
}

