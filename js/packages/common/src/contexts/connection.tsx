import {
  ENV as ChainId,
  TokenInfo,
  TokenListProvider,
} from '@solana/spl-token-registry';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import {
  Blockhash,
  clusterApiUrl,
  Commitment,
  ConfirmOptions,
  Connection,
  FeeCalculator,
  Keypair,
  RpcResponseAndContext,
  SignatureStatus,
  SimulatedTransactionResponse,
  Transaction,
  TransactionError,
  TransactionInstruction,
  TransactionSignature,
} from '@solana/web3.js';
import React, {
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { ExplorerLink } from '../components/ExplorerLink';
import { useQuerySearch } from '../hooks';
import { notify } from '../utils/notifications';
import { sleep, useLocalStorageState } from '../utils/utils';
import { WalletSigner } from './wallet';

export interface BlockhashAndFeeCalculator {
  blockhash: Blockhash;
  feeCalculator: FeeCalculator;
}

export type ENV =
  | 'mainnet-beta (Triton)'
  | 'mainnet-beta (Serum)'
  | 'devnet'
  | 'localnet'
  | 'lending';

export const ENDPOINTS: { name: ENV; endpoint: string; ChainId: ChainId }[] = [
  {
    name: 'mainnet-beta (Triton)',
    endpoint: 'https://holaplex.rpcpool.com',
    ChainId: ChainId.MainnetBeta,
  },
  {
    name: 'mainnet-beta (Serum)',
    endpoint: 'https://solana-api.projectserum.com/',
    ChainId: ChainId.MainnetBeta,
  },
  {
    name: 'devnet',
    endpoint: clusterApiUrl('devnet'),
    ChainId: ChainId.Devnet,
  },
];

const DEFAULT = ENDPOINTS[0].endpoint;
const DEFAULT_CONNECTION_TIMEOUT = 30 * 1000;

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
  connection: new Connection(DEFAULT, {
    commitment: 'recent',
    confirmTransactionInitialTimeout: DEFAULT_CONNECTION_TIMEOUT,
  }),
  env: ENDPOINTS[0].name,
  tokens: [],
  tokenMap: new Map<string, TokenInfo>(),
});

export function ConnectionProvider({
  children = undefined,
}: {
  children: ReactNode;
}) {
  const searchParams = useQuerySearch();
  const network = searchParams.get('network');
  const queryEndpoint =
    network && ENDPOINTS.find(({ name }) => name.startsWith(network))?.endpoint;

  const [savedEndpoint, setEndpoint] = useLocalStorageState(
    'connectionEndpoint',
    ENDPOINTS[0].endpoint,
  );
  const endpoint = queryEndpoint || savedEndpoint;

  const connection = useMemo(
    () =>
      new Connection(endpoint, {
        commitment: 'recent',
        confirmTransactionInitialTimeout: DEFAULT_CONNECTION_TIMEOUT,
      }),
    [endpoint],
  );

  const env =
    ENDPOINTS.find(end => end.endpoint === endpoint)?.name || ENDPOINTS[0].name;

  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [tokenMap, setTokenMap] = useState<Map<string, TokenInfo>>(new Map());
  useEffect(() => {
    // fetch token files
    new TokenListProvider().resolve().then(container => {
      const list = container
        .excludeByTag('nft')
        .filterByChainId(
          ENDPOINTS.find(end => end.endpoint === endpoint)?.ChainId ||
            ChainId.MainnetBeta,
        )
        .getList();

      const knownMints = [...list].reduce((map, item) => {
        map.set(item.address, item);
        return map;
      }, new Map<string, TokenInfo>());

      setTokenMap(knownMints);
      setTokens(list);
    });
  }, [env]);

  // The websocket library solana/web3.js uses closes its websocket connection when the subscription list
  // is empty after opening its first time, preventing subsequent subscriptions from receiving responses.
  // This is a hack to prevent the list from every getting empty
  useEffect(() => {
    const id = connection.onAccountChange(
      Keypair.generate().publicKey,
      () => {},
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

export function useConnection(): Connection {
  return useContext(ConnectionContext).connection;
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
  txid: string,
) => {
  // wait for all confirmation before geting transaction
  await connection.confirmTransaction(txid, 'max');

  const tx = await connection.getParsedConfirmedTransaction(txid);

  const errors: string[] = [];
  if (tx?.meta && tx.meta.logMessages) {
    tx.meta.logMessages.forEach(log => {
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

export async function sendTransactionsWithManualRetry(
  connection: Connection,
  wallet: WalletSigner,
  instructions: TransactionInstruction[][],
  signers: Keypair[][],
) {
  let stopPoint = 0;
  let tries = 0;
  let lastInstructionsLength = null;
  const toRemoveSigners: Record<number, boolean> = {};
  instructions = instructions.filter((instr, i) => {
    if (instr.length > 0) {
      return true;
    } else {
      toRemoveSigners[i] = true;
      return false;
    }
  });
  let filteredSigners = signers.filter((_, i) => !toRemoveSigners[i]);

  while (stopPoint < instructions.length && tries < 3) {
    instructions = instructions.slice(stopPoint, instructions.length);
    filteredSigners = filteredSigners.slice(stopPoint, filteredSigners.length);

    if (instructions.length === lastInstructionsLength) tries = tries + 1;
    else tries = 0;

    try {
      if (instructions.length === 1) {
        await sendTransactionWithRetry(
          connection,
          wallet,
          instructions[0],
          filteredSigners[0],
          'single',
        );
        stopPoint = 1;
      } else {
        stopPoint = await sendTransactions(
          connection,
          wallet,
          instructions,
          filteredSigners,
          SequenceType.StopOnFailure,
          'single',
        );
      }
    } catch (e) {
      console.error(e);
    }
    console.log(
      'Died on ',
      stopPoint,
      'retrying from instruction',
      instructions[stopPoint],
      'instructions length is',
      instructions.length,
    );
    lastInstructionsLength = instructions.length;
  }
}

export const sendTransactions = async (
  connection: Connection,
  wallet: WalletSigner,
  instructionSet: TransactionInstruction[][],
  signersSet: Keypair[][],
  sequenceType: SequenceType = SequenceType.Parallel,
  commitment: Commitment = 'singleGossip',
  successCallback: (txid: string, ind: number) => void = () => {},
  failCallback: (err: SendAndConfirmError, ind: number) => boolean = () =>
    false,
  block?: BlockhashAndFeeCalculator,
): Promise<number> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const unsignedTxns: Transaction[] = [];

  if (!block) {
    block = await connection.getRecentBlockhash(commitment);
  }

  for (let i = 0; i < instructionSet.length; i++) {
    const instructions = instructionSet[i];
    const signers = signersSet[i];

    if (instructions.length === 0) {
      continue;
    }

    const transaction = new Transaction();
    instructions.forEach(instruction => transaction.add(instruction));
    transaction.recentBlockhash = block.blockhash;
    transaction.setSigners(
      // fee payed by the wallet owner
      wallet.publicKey,
      ...signers.map(s => s.publicKey),
    );

    if (signers.length > 0) {
      transaction.partialSign(...signers);
    }

    unsignedTxns.push(transaction);
  }

  const signedTxns = await wallet.signAllTransactions(unsignedTxns);

  const pendingTxns: Promise<void>[] = [];

  const cancelToken = { idx: undefined as number | undefined };
  console.log(
    'Signed txns length',
    signedTxns.length,
    'vs handed in length',
    instructionSet.length,
  );
  for (let i = 0; i < signedTxns.length; i++) {
    const signedTxnPromise = sendSignedTransaction({
      connection,
      signedTransaction: signedTxns[i],
    })
      .then(res => {
        if (res.err) {
          failCallback(res.err, i);
          throw new Error(
            `Instructions set ${i} failed: ${JSON.stringify(res.err)}`,
          );
        }

        const { txid } = res;
        console.log(`Instructions set ${i} succeeded. Transaction Id ${txid}`);
        successCallback(txid, i);
      })
      .catch(e => {
        console.error(e);
        if (sequenceType === SequenceType.StopOnFailure) {
          cancelToken.idx ??= i;
        }

        throw e;
      });

    if (sequenceType !== SequenceType.Parallel) {
      try {
        await signedTxnPromise;
      } catch (e) {
        console.log('Caught failure', e);
        if (cancelToken.idx !== undefined) {
          console.log('Cancel requested after ', cancelToken.idx);
          return cancelToken.idx; // Return the txn we failed on by index
        }
      }
    } else {
      pendingTxns.push(signedTxnPromise);
    }
  }

  if (pendingTxns.length) {
    await Promise.all(pendingTxns);
  }

  return signedTxns.length;
};

export const sendTransaction = async (
  connection: Connection,
  wallet: WalletSigner,
  instructions: TransactionInstruction[],
  signers: Keypair[],
  awaitConfirmation = true,
  commitment: Commitment = 'singleGossip',
  includesFeePayer: boolean = false,
  block?: BlockhashAndFeeCalculator,
) => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let transaction = new Transaction();
  instructions.forEach(instruction => transaction.add(instruction));
  transaction.recentBlockhash = (
    block || (await connection.getRecentBlockhash(commitment))
  ).blockhash;

  if (includesFeePayer) {
    transaction.setSigners(...signers.map(s => s.publicKey));
  } else {
    transaction.setSigners(
      // fee payed by the wallet owner
      wallet.publicKey,
      ...signers.map(s => s.publicKey),
    );
  }

  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }
  if (!includesFeePayer) {
    transaction = await wallet.signTransaction(transaction);
  }

  const rawTransaction = transaction.serialize();
  const options = {
    skipPreflight: true,
    commitment,
  };

  const txid = await connection.sendRawTransaction(rawTransaction, options);
  let slot = 0;

  if (awaitConfirmation) {
    const confirmation = await awaitTransactionSignatureConfirmation(
      txid,
      DEFAULT_TIMEOUT,
      connection,
      commitment,
    );

    if (!confirmation)
      throw new Error('Timed out awaiting confirmation on transaction');
    slot = confirmation?.slot || 0;

    if (confirmation?.err) {
      const errors = await getErrorForTransaction(connection, txid);
      notify({
        message: 'Transaction failed...',
        description: (
          <>
            {errors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
            <ExplorerLink address={txid} type="transaction" />
          </>
        ),
        type: 'error',
      });

      throw new Error(
        `Raw transaction ${txid} failed (${JSON.stringify(status)})`,
      );
    }
  }

  return { txid, slot };
};


export const sendTransactionWithRetry = async (
  connection: Connection,
  wallet: WalletSigner,
  instructions: TransactionInstruction[],
  signers: Keypair[],
  commitment: Commitment = 'singleGossip',
  includesFeePayer: boolean = false,
  block?: BlockhashAndFeeCalculator,
  beforeSend?: () => void,
): Promise<SendSignedTransactionResult> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  let transaction = new Transaction();
  instructions.forEach(instruction => transaction.add(instruction));
  transaction.recentBlockhash = (
    block || (await connection.getRecentBlockhash(commitment))
  ).blockhash;

  if (includesFeePayer) {
    transaction.setSigners(...signers.map(s => s.publicKey));
  } else {
    transaction.setSigners(
      // fee payed by the wallet owner
      wallet.publicKey,
      ...signers.map(s => s.publicKey),
    );
  }

  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }
  if (!includesFeePayer) {
    transaction = await wallet.signTransaction(transaction);
  }

  if (beforeSend) {
    beforeSend();
  }

  return await sendSignedTransaction({
    connection,
    signedTransaction: transaction,
  });
};

export const getUnixTs = () => {
  return new Date().getTime() / 1000;
};

const DEFAULT_TIMEOUT = 30000;

export type SendAndConfirmError =
  | { type: 'tx-error'; inner: TransactionError; txid: TransactionSignature }
  | { type: 'timeout'; inner: unknown; txid?: TransactionSignature }
  | { type: 'misc-error'; inner: unknown; txid?: TransactionSignature };

/** Mirror of web3.js's `sendAndConfirmRawTransaction`, but with better errors. */
export async function sendAndConfirmRawTransactionEx(
  connection: Connection,
  rawTransaction: Buffer,
  options?: ConfirmOptions,
): Promise<
  | { ok: TransactionSignature; err?: undefined }
  | { ok?: undefined; err: SendAndConfirmError }
> {
  let txid: string | undefined;

  try {
    const sendOptions = options && {
      skipPreflight: options.skipPreflight,
      preflightCommitment: options.preflightCommitment || options.commitment,
    };

    txid = await connection.sendRawTransaction(rawTransaction, sendOptions);

    const status = (
      await connection.confirmTransaction(txid, options && options.commitment)
    ).value;

    if (status.err) {
      return { err: { type: 'tx-error', inner: status.err, txid } };
    }

    return { ok: txid };
  } catch (e: any) {
    let type: 'misc-error' | 'timeout' = 'misc-error';
    if (e.message.includes('Transaction was not confirmed in')) {
      type = 'timeout';
    }
    return { err: { type, inner: e, txid } };
  }
}

export type SendSignedTransactionResult =
  | { txid: string; slot: number; err?: undefined }
  | { txid?: undefined; err: SendAndConfirmError };

export async function sendSignedTransaction({
  signedTransaction,
  connection,
}: {
  signedTransaction: Transaction;
  connection: Connection;
  // successMessage?: string;
  // timeout?: number;
}): Promise<SendSignedTransactionResult> {
  const rawTransaction = signedTransaction.serialize();
  let slot = 0;

  const result = await sendAndConfirmRawTransactionEx(
    connection,
    rawTransaction,
    {
      skipPreflight: true,
      commitment: 'confirmed',
    },
  );

  if (result.err) return { err: result.err };

  const { ok: txid } = result;
  const confirmation = await connection.getConfirmedTransaction(
    txid,
    'confirmed',
  );

  if (confirmation) {
    slot = confirmation.slot;
  }

  return { txid, slot };
}

export async function simulateTransaction(
  connection: Connection,
  transaction: Transaction,
  commitment: Commitment,
): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> {
  // @ts-ignore
  transaction.recentBlockhash = await connection._recentBlockhash(
    // @ts-ignore
    connection._disableBlockhashCaching,
  );

  const signData = transaction.serializeMessage();
  // @ts-ignore
  const wireTransaction = transaction._serialize(signData);
  const encodedTransaction = wireTransaction.toString('base64');
  const config = { encoding: 'base64', commitment };
  const args = [encodedTransaction, config];

  // @ts-ignore
  const res = await connection._rpcRequest('simulateTransaction', args);
  if (res.error) {
    throw new Error('failed to simulate transaction: ' + res.error.message);
  }
  return res.result;
}

async function awaitTransactionSignatureConfirmation(
  txid: TransactionSignature,
  timeout: number,
  connection: Connection,
  commitment: Commitment = 'recent',
  queryStatus = false,
): Promise<SignatureStatus | null | void> {
  let done = false;
  let status: SignatureStatus | null | void = {
    slot: 0,
    confirmations: 0,
    err: null,
  };
  let subId = 0;
  status = await new Promise((resolve, reject) => {
    setTimeout(() => {
      if (done) {
        return;
      }
      done = true;
      console.log('Rejecting for timeout...');
      reject({ timeout: true });
    }, timeout);
    try {
      subId = connection.onSignature(
        txid,
        (result, context) => {
          done = true;
          status = {
            err: result.err,
            slot: context.slot,
            confirmations: 0,
          };
          if (result.err) {
            console.log('Rejected via websocket', result.err);
            reject(status);
          } else {
            console.log('Resolved via websocket', result);
            resolve(status);
          }
        },
        commitment,
      );
    } catch (e) {
      done = true;
      console.error('WS error in setup', txid, e);
    }
    while (!done && queryStatus) {
      // eslint-disable-next-line no-loop-func
      (async () => {
        try {
          const signatureStatuses = await connection.getSignatureStatuses([
            txid,
          ]);
          status = signatureStatuses && signatureStatuses.value[0];
          if (!done) {
            if (!status) {
              console.log('REST null result for', txid, status);
            } else if (status.err) {
              console.log('REST error for', txid, status);
              done = true;
              reject(status.err);
            } else if (!status.confirmations) {
              console.log('REST no confirmations for', txid, status);
            } else {
              console.log('REST confirmation for', txid, status);
              done = true;
              resolve(status);
            }
          }
        } catch (e) {
          if (!done) {
            console.log('REST connection error: txid', txid, e);
          }
        }
      })();
      return sleep(2000);
    }
  });

  //@ts-ignore
  if (connection._signatureSubscriptions[subId])
    connection.removeSignatureListener(subId);
  done = true;
  console.log('Returning status', status);
  return status;
}
