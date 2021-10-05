import React, {useEffect, useState} from 'react';
import {GatewayProvider as CivicGatewayProvider} from "@civic/solana-gateway-react";
import {useConnectionConfig} from "@oyster/common";
import {PublicKey, Transaction} from "@solana/web3.js";
import {useWallet} from "@identity.com/wallet-adapter-react";

// TEMP get from auction
export const gatekeeperNetwork = new PublicKey('gatbGF9DvLAw3kWyn1EmH5Nh1Sqp8sTukF7yaQpSc71');

type GatewayWallet = {
  publicKey: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
}

export function GatewayProvider({ children = null as any }) {
  const wallet = useWallet();
  const { endpoint } = useConnectionConfig();

  return (
    (wallet && wallet.connected && wallet.publicKey) ?
      <CivicGatewayProvider
        wallet={wallet as GatewayWallet}
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
