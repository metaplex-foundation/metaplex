import { useContext, useEffect, useState } from 'react';
import { attributes} from '../views/home/attributes';

import { getAllUserTokens, getApes } from 'apeshit-client';

import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@oyster/common';
import React from 'react';

const apeProgramPubKey = new PublicKey(
  'FBqrDGo5Q87gjP6hX4AAcCP1oQoW2eXashzrrcXLh5nz',
);

const getMyApes = (allApes: any[], allTokens: any[]) => {
  const _myApes = allTokens
    .map(t => {
      const found = allApes.find(ape => t.mint === ape.metadata.minted_token_pubkey);
      if (!found) {
        return;
      }
      return {
        ...found,
        token: t
      }
    })
    .filter(a => !!a);

  return Promise.allSettled(
    _myApes.map(a => fetch(a.attributes.image_url).then(res => res.json()).then(res => {  
        return {...a, ...res}
      }))
  ).then(res => res.map(r => (r as any).value));
};

export const getRarityForApe = (ape: any) => (ape?.attributes || [])
  .reduce((acc: any, curr: any) => acc + getRarity(curr), 0);

export const getRarity = ({
  trait_type,
  value
}:{
  trait_type: string,
  value: string
}) => {
  if (
    trait_type.toLowerCase() === 'clan'
    || trait_type.toLowerCase() === 'sign'
  ) {
    return 0;
  }
  const found = attributes[trait_type.toLowerCase() as string]?.find(
    (n: any) => (n[0] || '').trim().toLowerCase() === value.toLowerCase(),
  );

  if (!found) {
    return 0;
  }
  
  return Math.round(( ( (2500 / +found[1]))) / 10);
}

export const ApeContext = React.createContext({
  apes: [],
  myApes: [],
  loading: true,
})

export const ApeProvider = ({children = null as any}) => {
  const [apes, setApes] = useState<any[]>([]);
  const [myApes, setMyApes] = useState<any[]>([]);
  const connection = useConnection();
  const [loading, setLoading] = useState(true);
  const { wallet, connected } = useWallet();

  const loadApes = async () => {
    if (!loading) {
      return;
    }

    if (apes.length && myApes.length) {
      return;
    }

    if (!apes.length) {
      const a = await getApes(apeProgramPubKey, {connection});
      setApes(a);
    }

    if (wallet?.publicKey && !myApes.length) {
      const userTokens = await getAllUserTokens(wallet?.publicKey, {
        connection,
      });
      const loaded = await getMyApes(apes, userTokens);
      setMyApes(loaded);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApes();
  }, [apes, myApes, wallet?.publicKey, connected, connection, loading])

  return (
    <ApeContext.Provider
      value={{
        apes,
        loading,
        myApes
      } as any}
    >
      {children}
    </ApeContext.Provider>
  )
}

export const useApes = () =>  {
  const {
    loading,
    apes,
    myApes,
  } = useContext(ApeContext) as {
    loading: boolean,
    apes: any[],
    myApes: any[]
  };

  return {
    loading,
    apes,
    myApes,
  }
}