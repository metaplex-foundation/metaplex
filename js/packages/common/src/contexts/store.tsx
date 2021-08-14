import React, {
  createContext,
  FC,
  useState,
  useContext,
  useEffect,
} from 'react';
import { getStoreID, setProgramIds, StringPublicKey } from '../utils';
import { useQuerySearch } from '../hooks';

interface StoreConfig {
  address?: StringPublicKey;
  loading: boolean;
}

export const StoreContext = createContext<StoreConfig>(null!);

// TODO: pass storeAddress to speed up page
export const StoreProvider: FC<{ value?: string }> = ({ children, value }) => {
  const searchParams = useQuerySearch();
  const storeOwnerAddress = searchParams.get('store') || value;
  const [store, setStore] = useState<StoreConfig>({
    loading: !!storeOwnerAddress || false,
  });

  useEffect(() => {
    console.log(`STORE_OWNER_ADDRESS: ${value}`);
    if (storeOwnerAddress) {
      getStoreID(storeOwnerAddress).then(storeAddress => {
        setProgramIds(storeAddress); // fallback
        setStore({ address: storeAddress, loading: false });
        console.log(`CUSTOM STORE: ${storeAddress}`);
      });
    }
  }, [value]);

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

export const useStore = () => {
  return useContext(StoreContext);
};
