import React, {
  createContext,
  FC,
  useState,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { getStoreID, setProgramIds, StringPublicKey } from '../utils';
import { getTwitterHandle } from '../actions';
import { useQuerySearch } from '../hooks';
import { useConnection } from '../contexts/connection';

export interface StorefrontMeta {
  title: string;
  description: string;
  favicon: string;
}

export interface StorefrontTheme {
  logo?: string;
  banner?: string;
  stylesheet: string;
  color: {
    primary: string;
    background: string;
  };
  font: {
    title: string;
    text: string;
  };
}

export interface StorefrontSocialInfo {
  instagram?: string;
  discord?: string;
  website?: string;
}

export interface StorefrontIntegrations {
  injectInHeadTag?: string;
  ga4?: string;
  twitterVerification?: string;
  hotjar?: string;
  segment?: string;
  crossmintClientId?: string;
}

export interface Storefront {
  pubkey: string;
  subdomain: string;
  meta: StorefrontMeta;
  theme: StorefrontTheme;
  social?: StorefrontSocialInfo;
  integrations?: StorefrontIntegrations;
}

export interface StorefrontConfig {
  storefront: Storefront | void;
}

export interface ArweaveTag {
  name: string;
  value: string;
}

export interface ArweaveTransaction {
  id: string;
  tags: ArweaveTag[];
}

type ArweaveNode = ArweaveTransaction;

export interface ArweaveEdge {
  node: ArweaveNode;
}

export interface ArweaveConnection {
  edges: ArweaveEdge[];
}

export interface ArweaveQueries {
  transactions: ArweaveConnection;
}

export interface ArweaveQueryResponse {
  data: ArweaveQueries;
}

interface StoreConfig {
  // Store Address
  storeAddress?: StringPublicKey;
  // Store was configured via ENV or query params
  isConfigured: boolean;
  // Initial calculating of store address completed (successfully or not)
  isReady: boolean;
  // recalculate store address for specified owner address
  setStoreForOwner: (ownerAddress?: string) => Promise<string | undefined>;

  ownerAddress?: StringPublicKey;

  storefront: Storefront;

  loadingStore: boolean;
}

export const StoreContext = createContext<StoreConfig>(null!);

export const StoreProvider: FC<{
  storefront: Storefront;
  storeAddress?: string;
}> = ({ children, storefront, storeAddress }) => {
  const ownerAddress = storefront.pubkey;
  const searchParams = useQuerySearch();
  const ownerAddressFromQuery = searchParams.get('store');
  const [loadingStore, setLoadingStore] = useState(true);
  const [twitterHandle, setTwitterHandle] = useState<string>();
  const connection = useConnection();

  const initOwnerAddress = ownerAddressFromQuery || ownerAddress;
  const initStoreAddress = !ownerAddressFromQuery ? storeAddress : undefined;
  const isConfigured = Boolean(initStoreAddress || initOwnerAddress);

  const [store, setStore] = useState<
    Pick<StoreConfig, 'storeAddress' | 'isReady'>
  >({
    storeAddress: initStoreAddress,
    isReady: Boolean(!initOwnerAddress || initStoreAddress),
  });

  const setStoreForOwner = useMemo(
    () => async (ownerAddress?: string) => {
      const storeAddress = await getStoreID(ownerAddress);
      const twitterHandle = await getTwitterHandle(
        connection,
        ownerAddress as string,
      );

      setProgramIds(storeAddress); // fallback
      setTwitterHandle(twitterHandle);
      setStore({ storeAddress, isReady: true });
      console.log(`CUSTOM STORE: ${storeAddress}`);
      return storeAddress;
    },
    [],
  );

  useEffect(() => {
    console.log(`STORE_OWNER_ADDRESS: ${initOwnerAddress}`);
    if (initOwnerAddress && !initStoreAddress) {
      setStoreForOwner(initOwnerAddress);
    } else {
      setProgramIds(initStoreAddress); // fallback
      console.log(`CUSTOM STORE FROM ENV: ${initStoreAddress}`);
    }

    setLoadingStore(false);
  }, [initOwnerAddress]);

  return (
    <StoreContext.Provider
      value={{
        ...store,
        setStoreForOwner,
        isConfigured,
        ownerAddress,
        storefront: {
          ...storefront,
          integrations: {
            ...storefront.integrations,
            twitterVerification: twitterHandle,
          },
        },
        loadingStore,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  return useContext(StoreContext);
};
