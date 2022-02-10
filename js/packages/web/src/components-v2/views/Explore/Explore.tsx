import { useWallet } from '@solana/wallet-adapter-react';
import React, { FC } from 'react';
import { ExploreCollections } from '../../sections/ExploreCollections';

export interface ExploreProps {
  [x: string]: any;
}

export const Explore: FC<ExploreProps> = () => {
  const wallet = useWallet();

  console.log(wallet.publicKey?.toBase58());
  return (
    <>
      <ExploreCollections />
    </>
  );
};

export default Explore;
