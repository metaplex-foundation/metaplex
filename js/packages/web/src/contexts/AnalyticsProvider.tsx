import React, { useContext, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { ENDPOINTS, useConnectionConfig, useStore } from '@oyster/common';
import { useLocation } from 'react-router';
import mixpanel from 'mixpanel-browser';
import { useSolPrice } from '.';

export const GOOGLE_ANALYTICS_ID =
  process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || 'G-HLNC4C2YKN';
const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;

interface AnalyticsUserProperties {
  // user dimensions
  user_id: string; // google reserved
  pubkey: string; // same as user_id, but for use in custom reports
}
interface CustomEventDimensions {
  // event dimensions
  store_domain: string;
  store_title: string;
  storefront_pubkey: string;
  is_store_owner: boolean;
  network: string; // mainnet, devnet, etc.
  // metrics
  sol_value?: number;
}

type EventAttributes = {
  event_category: 'Listings' | 'Minter';
  event_label?: string;
  value?: number;
  sol_value?: number;
  listingType?: 'auction' | 'instant_sale';
  nftAddress?: string;
  page_path?: string;
  [key: string]: string | number | boolean | any[] | null | undefined;
} & Partial<CustomEventDimensions>;

const AnalyticsContext = React.createContext<{
  track: (action: string, attributes: EventAttributes) => void;
} | null>(null);

// @ts-ignore
const gtag = window.gtag;

export function AnalyticsProvider(props: { children: React.ReactNode }) {
  const { publicKey } = useWallet();
  const { storefront } = useStore();
  const { endpoint } = useConnectionConfig();
  const location = useLocation();
  const solPrice = useSolPrice();

  // user pubkey / id
  const pubkey = publicKey?.toBase58() || '';
  const endpointName = ENDPOINTS.find(e => e.endpoint === endpoint)?.name;

  // initial intial config
  useEffect(() => {
    if (MIXPANEL_TOKEN) {
      mixpanel.init(MIXPANEL_TOKEN, {
        debug:
          window.location.host.includes('localhost') ||
          window.location.host.includes('.dev'),
      });
    }
  }, []);

  useEffect(() => {
    // const isStoreOwner = ownerAddress === publicKey?.toBase58();

    setUserProperties({
      user_id: pubkey,
      pubkey: pubkey,
    });

    if (MIXPANEL_TOKEN && pubkey) {
      mixpanel.identify(pubkey);
      mixpanel.people.set_once({
        pubkey,
        isStoreOwner: pubkey === storefront.pubkey,
      });
    }

    // initial config
    configureAnalytics({
      is_store_owner: pubkey === storefront.pubkey, // isStoreOwner,
      network: endpointName,
      store_domain: storefront.subdomain,
      store_title: storefront.meta.title,
      storefront_pubkey: storefront.pubkey,
    });
  }, [pubkey, endpointName]);

  useEffect(() => {
    pageview(location.pathname);
  }, [location]);

  function setUserProperties(attributes: AnalyticsUserProperties) {
    gtag('set', 'user_properties', {
      ...attributes,
    });
  }

  function configureAnalytics(options: Partial<CustomEventDimensions>) {
    if (!gtag) return;
    gtag('config', GOOGLE_ANALYTICS_ID, {
      ...options,
      send_page_view: false,
    });
  }

  function pageview(path: string) {
    if (!gtag) return;
    // @ts-ignore
    track('page_view', {
      page_path: path,
    });
  }

  function track(action: string, attributes: EventAttributes) {
    if (!gtag) return;
    const { sol_value, value, ...otherAttributes } = attributes;
    const attrs = {
      page_location: window.location.href,
      subdomain: storefront.subdomain,
      storeTitle: storefront.meta.title,
      userPubkey: pubkey,
      ...(sol_value && solPrice
        ? {
            value: sol_value * solPrice, //Google Analytics likes this one in USD :)
            sol_value: sol_value,
          }
        : {
            value,
          }),
      ...otherAttributes,
    };
    if (gtag && GOOGLE_ANALYTICS_ID) {
      gtag('event', action, attrs);
    }

    if (MIXPANEL_TOKEN) {
      mixpanel.track(action, {
        ...attrs,
        // need to attach these here as Mixpanel does not support super properties without persitence
        ownsThisStore: pubkey ? storefront.pubkey === pubkey : undefined,
        network: endpointName,
        storeDomain: storefront.subdomain,
        storeTitle: storefront.meta.title,
        storefrontPubkey: storefront.pubkey,
      });
    }
  }

  return (
    <AnalyticsContext.Provider
      value={{
        track,
      }}
    >
      {props.children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (context === null) {
    throw new Error('useAnalytics must be used within an AnalyticsProvider');
  }
  return context;
}
