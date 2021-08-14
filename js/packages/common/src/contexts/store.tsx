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
  isReady: boolean;
}

export const StoreContext = createContext<StoreConfig>(null!);

export const StoreProvider: FC<{
  ownerAddress?: string;
  storeAddress?: string;
}> = ({ children, ownerAddress, storeAddress }) => {
  const searchParams = useQuerySearch();
  const ownerAddressFromQuery = searchParams.get('store');

  const initOwnerAddress = ownerAddressFromQuery || ownerAddress;
  const initStoreAddress = !ownerAddressFromQuery ? storeAddress : undefined;

  const [store, setStore] = useState<StoreConfig>({
    address: initStoreAddress,
    isReady: Boolean(initStoreAddress && !initOwnerAddress),
  });

  useEffect(() => {
    console.log(`STORE_OWNER_ADDRESS: ${initOwnerAddress}`);
    if (initOwnerAddress && !initStoreAddress) {
      getStoreID(initOwnerAddress).then(storeAddress => {
        setProgramIds(storeAddress); // fallback
        setStore({ address: storeAddress, isReady: true });
        console.log(`CUSTOM STORE: ${storeAddress}`);
      });
    } else {
      setProgramIds(initStoreAddress); // fallback
      console.log(`CUSTOM STORE FROM ENV: ${initStoreAddress}`);
    }
  }, [initOwnerAddress]);

  return (
    <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
  );
};

export const useStore = () => {
  return useContext(StoreContext);
};
