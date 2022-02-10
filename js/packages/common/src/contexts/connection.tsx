import React, { useContext, useEffect, useRef, useState } from 'react';
import { getTokenListContainerPromise } from '../utils';
import { TokenInfo, ENV as ChainId } from '@solana/spl-token-registry';
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import {
  Keypair,
  clusterApiUrl,
  Commitment,
  Connection,
  RpcResponseAndContext,
  SignatureStatus,
  SimulatedTransactionResponse,
  Transaction,
  TransactionInstruction,
  TransactionSignature,
  Blockhash,
  FeeCalculator,
} from '@solana/web3.js';
import { chunks, sleep, useLocalStorageState } from '../utils/utils';
import { notify } from '../utils/notifications';
import { ExplorerLink } from '../components/ExplorerLink';
import { useQuerySearch } from '../hooks';
import { WalletSigner } from './wallet';

interface BlockhashAndFeeCalculator {
  blockhash: Blockhash;
  feeCalculator: FeeCalculator;
}

export type ENDPOINT_NAME =
  | 'mainnet-beta'
  | 'testnet'
  | 'devnet'
  | 'localnet'
  | 'lending';

type Endpoint = {
  name: ENDPOINT_NAME;
  label: string;
  url: string;
  chainId: ChainId;
};

export const ENDPOINTS: Array<Endpoint> = [
  {
    name: 'mainnet-beta',
    label: 'mainnet-beta',
    url: 'https://api.metaplex.solana.com/',
    chainId: ChainId.MainnetBeta,
  },
  {
    name: 'testnet',
    label: 'testnet',
    url: clusterApiUrl('testnet'),
    chainId: ChainId.Testnet,
  },
  {
    name: 'devnet',
    label: 'devnet',
    url: clusterApiUrl('devnet'),
    chainId: ChainId.Devnet,
  },
];

const DEFAULT_ENDPOINT = ENDPOINTS[0];

interface ConnectionConfig {
  connection: Connection;
  endpoint: Endpoint;
  tokens: Map<string, TokenInfo>;
}

const ConnectionContext = React.createContext<ConnectionConfig>({
  connection: new Connection(DEFAULT_ENDPOINT.url, 'recent'),
  endpoint: DEFAULT_ENDPOINT,
  tokens: new Map(),
});

export function ConnectionProvider({ children }: { children: any }) {
  const searchParams = useQuerySearch();
  const [networkStorage, setNetworkStorage] =
    useLocalStorageState<ENDPOINT_NAME>('network', DEFAULT_ENDPOINT.name);
  const networkParam = searchParams.get('network');

  let maybeEndpoint;
  if (networkParam) {
    const endpointParam = ENDPOINTS.find(({ name }) => name === networkParam);
    if (endpointParam) {
      maybeEndpoint = endpointParam;
    }
  }

  if (networkStorage && !maybeEndpoint) {
    const endpointStorage = ENDPOINTS.find(
      ({ name }) => name === networkStorage,
    );
    if (endpointStorage) {
      maybeEndpoint = endpointStorage;
    }
  }

  const endpoint = maybeEndpoint || DEFAULT_ENDPOINT;

  const { current: connection } = useRef(new Connection(endpoint.url));

  const [tokens, setTokens] = useState<Map<string, TokenInfo>>(new Map());

  useEffect(() => {
    function fetchTokens() {
      return getTokenListContainerPromise().then(container => {
        const list = container
          .excludeByTag('nft')
          .filterByChainId(endpoint.chainId)
          .getList();

        const map = new Map(list.map(item => [item.address, item]));
        setTokens(map);
      });
    }

    fetchTokens();
  }, []);

  useEffect(() => {
    function updateNetworkInLocalStorageIfNeeded() {
      if (networkStorage !== endpoint.name) {
        setNetworkStorage(endpoint.name);
      }
    }

    updateNetworkInLocalStorageIfNeeded();
  }, []);

  // solana/web3.js closes its websocket connection when the subscription list
  // is empty after opening for the first time, preventing subsequent
  // subscriptions from receiving responses.
  // This is a hack to prevent the list from ever being empty.
  useEffect(() => {
    const id = connection.onAccountChange(
      Keypair.generate().publicKey,
      () => {},
    );
    return () => {
      connection.removeAccountChangeListener(id);
    };
  }, []);

  useEffect(() => {
    const id = connection.onSlotChange(() => null);
    return () => {
      connection.removeSlotChangeListener(id);
    };
  }, []);

  const contextValue = React.useMemo(() => {
    return {
      endpoint,
      connection,
      tokens,
    };
  }, [tokens]);

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
}

export function useConnection() {
  const { connection } = useContext(ConnectionContext);
  return connection;
}

export function useConnectionConfig() {
  const { endpoint, tokens } = useContext(ConnectionContext);
  return {
    endpoint,
    tokens,
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

export const sendTransactionsInChunks = async (
  connection: Connection,
  wallet: WalletSigner,
  instructionSet: TransactionInstruction[][],
  signersSet: Keypair[][],
  sequenceType: SequenceType = SequenceType.Parallel,
  commitment: Commitment = 'singleGossip',
  timeout: number = 120000,
  batchSize: number,
): Promise<number> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();
  let instructionsChunk: TransactionInstruction[][][] = [instructionSet];
  let signersChunk: Keypair[][][] = [signersSet];

  instructionsChunk = chunks(instructionSet, batchSize);
  signersChunk = chunks(signersSet, batchSize);

  for (let c = 0; c < instructionsChunk.length; c++) {
    const unsignedTxns: Transaction[] = [];

    for (let i = 0; i < instructionsChunk[c].length; i++) {
      const instructions = instructionsChunk[c][i];
      const signers = signersChunk[c][i];
      if (instructions.length === 0) {
        continue;
      }
      const transaction = new Transaction();
      const block = await connection.getRecentBlockhash(commitment);

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

    const breakEarlyObject = { breakEarly: false, i: 0 };
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
        timeout,
      });
      signedTxnPromise.catch(() => {
        // @ts-ignore
        if (sequenceType === SequenceType.StopOnFailure) {
          breakEarlyObject.breakEarly = true;
          breakEarlyObject.i = i;
        }
      });

      try {
        await signedTxnPromise;
      } catch (e) {
        console.log('Caught failure', e);
        if (breakEarlyObject.breakEarly) {
          console.log('Died on ', breakEarlyObject.i);
          return breakEarlyObject.i; // Return the txn we failed on by index
        }
      }
    }
  }

  return instructionSet.length;
};

export const sendTransactions = async (
  connection: Connection,
  wallet: WalletSigner,
  instructionSet: TransactionInstruction[][],
  signersSet: Keypair[][],
  sequenceType: SequenceType = SequenceType.Parallel,
  commitment: Commitment = 'singleGossip',
  successCallback: (txid: string, ind: number) => void = () => {},
  failCallback: (reason: string, ind: number) => boolean = () => false,
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

  const pendingTxns: Promise<{ txid: string; slot: number }>[] = [];

  const breakEarlyObject = { breakEarly: false, i: 0 };
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
    });

    signedTxnPromise
      .then(({ txid }) => {
        successCallback(txid, i);
      })
      .catch(() => {
        // @ts-ignore
        failCallback(signedTxns[i], i);
        if (sequenceType === SequenceType.StopOnFailure) {
          breakEarlyObject.breakEarly = true;
          breakEarlyObject.i = i;
        }
      });

    if (sequenceType !== SequenceType.Parallel) {
      try {
        await signedTxnPromise;
      } catch (e) {
        console.log('Caught failure', e);
        if (breakEarlyObject.breakEarly) {
          console.log('Died on ', breakEarlyObject.i);
          return breakEarlyObject.i; // Return the txn we failed on by index
        }
      }
    } else {
      pendingTxns.push(signedTxnPromise);
    }
  }

  if (sequenceType !== SequenceType.Parallel) {
    await Promise.all(pendingTxns);
  }

  return signedTxns.length;
};

export const sendTransactionsWithRecentBlock = async (
  connection: Connection,
  wallet: WalletSigner,
  instructionSet: TransactionInstruction[][],
  signersSet: Keypair[][],
  commitment: Commitment = 'singleGossip',
): Promise<number> => {
  if (!wallet.publicKey) throw new WalletNotConnectedError();

  const unsignedTxns: Transaction[] = [];

  for (let i = 0; i < instructionSet.length; i++) {
    const instructions = instructionSet[i];
    const signers = signersSet[i];

    if (instructions.length === 0) {
      continue;
    }

    const block = await connection.getRecentBlockhash(commitment);
    await sleep(1200);

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

  const breakEarlyObject = { breakEarly: false, i: 0 };
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
    });

    signedTxnPromise.catch(() => {
      breakEarlyObject.breakEarly = true;
      breakEarlyObject.i = i;
    });

    try {
      await signedTxnPromise;
    } catch (e) {
      console.log('Caught failure', e);
      if (breakEarlyObject.breakEarly) {
        console.log('Died on ', breakEarlyObject.i);
        return breakEarlyObject.i; // Return the txn we failed on by index
      }
    }
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
            {errors.map((err, ii) => (
              <div key={ii}>{err}</div>
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

  if (beforeSend) {
    beforeSend();
  }

  const { txid, slot } = await sendSignedTransaction({
    connection,
    signedTransaction: transaction,
  });

  return { txid, slot };
};

export const getUnixTs = () => {
  return new Date().getTime() / 1000;
};

const DEFAULT_TIMEOUT = 15000;

export async function sendSignedTransaction({
  signedTransaction,
  connection,
  timeout = DEFAULT_TIMEOUT,
}: {
  signedTransaction: Transaction;
  connection: Connection;
  sendingMessage?: string;
  sentMessage?: string;
  successMessage?: string;
  timeout?: number;
}): Promise<{ txid: string; slot: number }> {
  const rawTransaction = signedTransaction.serialize();
  const startTime = getUnixTs();
  let slot = 0;
  const txid: TransactionSignature = await connection.sendRawTransaction(
    rawTransaction,
    {
      skipPreflight: true,
    },
  );

  console.log('Started awaiting confirmation for', txid);

  let done = false;
  (async () => {
    while (!done && getUnixTs() - startTime < timeout) {
      connection.sendRawTransaction(rawTransaction, {
        skipPreflight: true,
      });
      await sleep(500);
    }
  })();
  try {
    const confirmation = await awaitTransactionSignatureConfirmation(
      txid,
      timeout,
      connection,
      'recent',
      true,
    );

    if (!confirmation)
      throw new Error('Timed out awaiting confirmation on transaction');

    if (confirmation.err) {
      console.error(confirmation.err);
      throw new Error('Transaction failed: Custom instruction error');
    }

    slot = confirmation?.slot || 0;
  } catch (err: any) {
    console.error('Timeout Error caught', err);
    if (err.timeout) {
      throw new Error('Timed out awaiting confirmation on transaction');
    }
    let simulateResult: SimulatedTransactionResponse | null = null;
    try {
      simulateResult = (
        await simulateTransaction(connection, signedTransaction, 'single')
      ).value;
      // eslint-disable-next-line no-empty
    } catch (e) {}
    if (simulateResult && simulateResult.err) {
      if (simulateResult.logs) {
        for (let i = simulateResult.logs.length - 1; i >= 0; --i) {
          const line = simulateResult.logs[i];
          if (line.startsWith('Program log: ')) {
            throw new Error(
              'Transaction failed: ' + line.slice('Program log: '.length),
            );
          }
        }
      }
      throw new Error(JSON.stringify(simulateResult.err));
    }
    // throw new Error('Transaction failed');
  } finally {
    done = true;
  }

  console.log('Latency', txid, getUnixTs() - startTime);
  return { txid, slot };
}

async function simulateTransaction(
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
  const config: any = { encoding: 'base64', commitment };
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
  status = await (async (): Promise<SignatureStatus | null | void> => {
    setTimeout(() => {
      if (done) {
        return;
      }
      done = true;
      console.log('Rejecting for timeout...');
      throw { timeout: true };
    }, timeout);
    try {
      return await new Promise((resolve, reject) => {
        subId = connection.onSignature(
          txid,
          (result, context) => {
            done = true;
            const nextStatus = {
              err: result.err,
              slot: context.slot,
              confirmations: 0,
            };
            if (result.err) {
              console.log('Rejected via websocket', result.err);
              reject(nextStatus);
            } else {
              console.log('Resolved via websocket', result);
              resolve(nextStatus);
            }
          },
          commitment,
        );
      });
    } catch (e) {
      done = true;
      console.error('WS error in setup', txid, e);
    }
    while (!done && queryStatus) {
      try {
        const signatureStatuses = await connection.getSignatureStatuses([txid]);
        const nextStatus = signatureStatuses && signatureStatuses.value[0];
        if (!done) {
          if (!nextStatus) {
            console.log('REST null result for', txid, nextStatus);
          } else if (nextStatus.err) {
            console.log('REST error for', txid, nextStatus);
            done = true;
            throw nextStatus.err;
          } else if (!nextStatus.confirmations) {
            console.log('REST no confirmations for', txid, nextStatus);
          } else {
            console.log('REST confirmation for', txid, nextStatus);
            done = true;
            return nextStatus;
          }
        }
      } catch (e) {
        if (!done) {
          console.log('REST connection error: txid', txid, e);
        }
      }
      await sleep(2000);
    }
  })();

  //@ts-ignore
  if (connection._signatureSubscriptions[subId])
    connection.removeSignatureListener(subId);
  done = true;
  console.log('Returning status', status);
  return status;
}
