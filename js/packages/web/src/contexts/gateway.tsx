import React from 'react';
import { SolanaGatewayProvider} from "@civic/solana-gateway-react";
import {useConnectionConfig} from "@oyster/common";
import {PublicKey, Transaction} from "@solana/web3.js";
import {useWallet} from "@solana/wallet-adapter-react";
import {useGatekeeperNetwork} from "./gatekeeperNetwork";

type GatewayWallet = {
  publicKey: PublicKey,
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
}
export const GatewayProvider:React.FC = ({ children}) => {
  const wallet = useWallet();
  const { endpoint } = useConnectionConfig();
  const {gatekeeperNetwork} = useGatekeeperNetwork();

  return (
    (wallet && wallet.connected && wallet.publicKey && gatekeeperNetwork) ?
      <SolanaGatewayProvider
        wallet={wallet as GatewayWallet}
        gatekeeperNetwork={gatekeeperNetwork.publicKey}
        stage='dev'
        clusterUrl={endpoint}
      >
        {children}
      </SolanaGatewayProvider>
      : <>
        {children}
      </>
  );
};
