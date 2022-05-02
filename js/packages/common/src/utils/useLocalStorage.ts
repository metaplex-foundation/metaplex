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
