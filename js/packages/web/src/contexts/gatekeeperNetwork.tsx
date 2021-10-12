import React, {useContext, useState} from 'react';
import {PublicKey} from "@solana/web3.js";

export type GatekeeperNetworkSelection = { publicKey: PublicKey, name: string, description: string }
export const gatekeeperNetworks:GatekeeperNetworkSelection[] = [{
  publicKey: new PublicKey('tgnuXXNMDLK8dy7Xm1TdeGyc95MDym4bvAQCwcW21Bf'),
  name: 'Public Pass',
  description: 'Use this when generating tokens with the solana-gatekeeper-lib'
},{
  publicKey: new PublicKey('gatbGF9DvLAw3kWyn1EmH5Nh1Sqp8sTukF7yaQpSc71'),
  name: 'Civic Genesis Pass',
  description: 'Full KYC'
},{
  publicKey: new PublicKey('tgaxdij8CgAbfDDkhtkvZgEtwLPrVEXTQe3L4zkA7gE'),
  name: 'Civic Test Pass',
  description: 'Full KYC'
}]

export type GatekeeperNetworkProps = { gatekeeperNetwork?: GatekeeperNetworkSelection, setGatekeeperNetwork: (gatekeeperNetwork: GatekeeperNetworkSelection) => void }
const GatekeeperNetworkContext = React.createContext<GatekeeperNetworkProps>({
  gatekeeperNetwork: undefined,
  setGatekeeperNetwork: () => {},
});
export const GatekeeperNetworkProvider:React.FC<{}> = ({ children }) => {
  const [gatekeeperNetwork, setGatekeeperNetwork] = useState<GatekeeperNetworkSelection|undefined>();

  return <GatekeeperNetworkContext.Provider value={{
    gatekeeperNetwork,
    setGatekeeperNetwork
  }}>{children}</GatekeeperNetworkContext.Provider>
}


export const useGatekeeperNetwork = (): GatekeeperNetworkProps => useContext(GatekeeperNetworkContext)
