import { useLocalStorageState } from "@oyster/common";
import {
  Keypair,
  Commitment,
  Connection,
  Transaction,
  TransactionInstruction,
  Blockhash,
  FeeCalculator,
} from "@solana/web3.js";
import React, { useContext, useEffect, useMemo, useState } from "react";
import {
  sendSignedTransaction,
} from "../utils/transactions";
import {
  TokenInfo,
  TokenListProvider,
  ENV as ChainId,
} from "@solana/spl-token-registry";
import { WalletSigner } from "./WalletContext/WalletContext";
import { WalletNotConnectedError } from "@solana/wallet-adapter-base";

interface BlockhashAndFeeCalculator {
  blockhash: Blockhash;
  feeCalculator: FeeCalculator;
}

export type ENV = "mainnet-beta" | "testnet" | "devnet" | "localnet";

export const ENDPOINTS = [
  {
    name: "mainnet-beta" as ENV,
    endpoint: "https://api.mainnet-beta.solana.com",
    ChainId: ChainId.MainnetBeta,
  },
  {
    name: "devnet" as ENV,
    endpoint: "https://api.devnet.solana.com",
    ChainId: ChainId.Devnet,
  },
];

const DEFAULT = ENDPOINTS[0].endpoint;

interface ConnectionConfig {
  connection: Connection;
  endpoint: string;
  env: ENV;
  setEndpoint: (val: string) => void;
  tokens: TokenInfo[];
  tokenMap: Map<string, TokenInfo>;
}

const ConnectionContext = React.createContext<ConnectionConfig>({
  endpoint: DEFAULT,
  setEndpoint: () => {},
  connection: new Connection(DEFAULT, "recent"),
  env: ENDPOINTS[0].name,
  tokens: [],
  tokenMap: new Map<string, TokenInfo>(),
});

export function ConnectionProvider({ children = undefined } : { children : React.ReactNode }) {
  const [endpoint, setEndpoint] = useLocalStorageState(
    "connectionEndpoint",
    ENDPOINTS[0].endpoint
  );

  const connection = useMemo(
    () => new Connection(endpoint, "recent"),
    [endpoint]
  );

  const env =
    ENDPOINTS.find((end) => end.endpoint === endpoint)?.name ||
    ENDPOINTS[0].name;

  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());
  useEffect(() => {
    // fetch token files
    new TokenListProvider().resolve().then((container) => {
      const list = container
        .excludeByTag("nft")
        .filterByChainId(
          ENDPOINTS.find((end) => end.endpoint === endpoint)?.ChainId ||
            ChainId.MainnetBeta
        )
        .getList();

      const knownMints = [...list].reduce((map, item) => {
        map.set(item.address, item);
        return map;
      }, new Map<string, TokenInfo>());

      setTokenMap(knownMints);
      setTokens(list);
    });
  }, [env, endpoint]);

  // The websocket library solana/web3.js uses closes its websocket connection when the subscription list
  // is empty after opening its first time, preventing subsequent subscriptions from receiving responses.
  // This is a hack to prevent the list from every getting empty
  useEffect(() => {
    const id = connection.onAccountChange(
      Keypair.generate().publicKey,
      () => {}
    );
    return () => {
      connection.removeAccountChangeListener(id);
    };
  }, [connection]);

  useEffect(() => {
    const id = connection.onSlotChange(() => null);
    return () => {
      connection.removeSlotChangeListener(id);
    };
  }, [connection]);

  return (
    <ConnectionContext.Provider
      value={{
        endpoint,
        setEndpoint,
        connection,
        tokens,
        tokenMap,
        env,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  return useContext(ConnectionContext).connection as Connection;
}

export function useConnectionConfig() {
  const context = useContext(ConnectionContext);
  return {
    endpoint: context.endpoint,
    setEndpoint: context.setEndpoint,
    env: context.env,
    tokens: context.tokens,
    tokenMap: context.tokenMap,
  };
}

export const getErrorForTransaction = async (
  connection: Connection,
  txid: string
) => {
  // wait for all confirmation before geting transaction
  await connection.confirmTransaction(txid, "max");

  const tx = await connection.getParsedConfirmedTransaction(txid);

  const errors: string[] = [];
  if (tx?.meta && tx.meta.logMessages) {
    tx.meta.logMessages.forEach((log) => {
      const regex = /Error: (.*)/gm;
      let m;
      while ((m = regex.exec(log)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
          regex.lastIndex++;
        }

        if (m.length > 1) {
          errors.push(m[1]);
        }
      }
    });
  }

  return errors;
};

export enum SequenceType {
  Sequential,
  Parallel,
  StopOnFailure,
}

export const sendTransactionWithRetry = async (
  connection: Connection,
  wallet: WalletSigner,
  instructions: TransactionInstruction[],
  signers: Keypair[],
  commitment: Commitment = "singleGossip",
  includesFeePayer: boolean = false,
  block?: BlockhashAndFeeCalculator,
  beforeSend?: () => void
) : Promise<string| { txid: string; slot: number }> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let transaction = new Transaction();
  instructions.forEach((instruction) => transaction.add(instruction));
  transaction.recentBlockhash = (
    block || (await connection.getRecentBlockhash(commitment))
  ).blockhash;

  if (includesFeePayer) {
    transaction.setSigners(...signers.map((s) => s.publicKey));
  } else {
    transaction.setSigners(
      // fee payed by the wallet owner
      wallet.publicKey,
      ...signers.map((s) => s.publicKey)
    );
  }

  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }
  if (!includesFeePayer) {
    try {
      transaction = await wallet.signTransaction(transaction);
    } catch {
      return "Failed to sign transaction";
    }
  }

  if (beforeSend) {
    beforeSend();
  }
  console.log("About to send");
  try {
    const { txid, slot } = await sendSignedTransaction({
      connection,
      signedTransaction: transaction,
    });

    return { txid, slot };
  } catch (error) {
    console.error(error);
    return "See console logs";
  }
};

