import React from 'react';
import {GatewayProvider as CivicGatewayProvider} from "@civic/solana-gateway-react";
import {useConnectionConfig} from "@oyster/common";
import {PublicKey} from "@solana/web3.js";
import {useWallet} from "@solana/wallet-adapter-react";

// TEMP get from auction
export const gatekeeperNetwork = new PublicKey('gatbGF9DvLAw3kWyn1EmH5Nh1Sqp8sTukF7yaQpSc71');

// export interface GatewayContextState {
// }
//
// const GatewayContext = React.createContext<GatewayContextState | null>(
//   null,
// );
export function GatewayProvider({ children = null as any }) {
  const { wallet } = useWallet();
  const { endpoint } = useConnectionConfig();

  return (
    (wallet) ?
      <CivicGatewayProvider
        // @ts-ignore
        wallet={wallet}
      gatekeeperNetwork={gatekeeperNetwork}
  stage='dev'
  clusterUrl={endpoint}
    >
    {children}
    </CivicGatewayProvider>
: <>
    {children}
  </>
);
}

// export const useGateway = () => {
//   const context = useContext(GatewayContext);
//   return context as GatewayContextState;
// };
