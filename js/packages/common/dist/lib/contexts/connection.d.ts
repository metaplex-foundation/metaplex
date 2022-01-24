/// <reference types="react" />
import { TokenInfo, ENV as ChainId } from '@solana/spl-token-registry';
import { Keypair, Commitment, Connection, Transaction, TransactionInstruction, Blockhash, FeeCalculator } from '@solana/web3.js';
import { WalletSigner } from './wallet';
interface BlockhashAndFeeCalculator {
    blockhash: Blockhash;
    feeCalculator: FeeCalculator;
}
export declare type ENDPOINT_NAME = 'mainnet-beta' | 'testnet' | 'devnet' | 'localnet' | 'lending';
declare type Endpoint = {
    name: ENDPOINT_NAME;
    label: string;
    url: string;
    chainId: ChainId;
};
export declare const ENDPOINTS: Array<Endpoint>;
export declare function ConnectionProvider({ children }: {
    children: any;
}): JSX.Element;
export declare function useConnection(): Connection;
export declare function useConnectionConfig(): {
    endpoint: Endpoint;
    tokens: Map<string, TokenInfo>;
};
export declare const getErrorForTransaction: (connection: Connection, txid: string) => Promise<string[]>;
export declare enum SequenceType {
    Sequential = 0,
    Parallel = 1,
    StopOnFailure = 2
}
export declare function sendTransactionsWithManualRetry(connection: Connection, wallet: WalletSigner, instructions: TransactionInstruction[][], signers: Keypair[][]): Promise<void>;
export declare const sendTransactionsInChunks: (connection: Connection, wallet: WalletSigner, instructionSet: TransactionInstruction[][], signersSet: Keypair[][], sequenceType: SequenceType | undefined, commitment: Commitment | undefined, timeout: number | undefined, batchSize: number) => Promise<number>;
export declare const sendTransactions: (connection: Connection, wallet: WalletSigner, instructionSet: TransactionInstruction[][], signersSet: Keypair[][], sequenceType?: SequenceType, commitment?: Commitment, successCallback?: (txid: string, ind: number) => void, failCallback?: (reason: string, ind: number) => boolean, block?: BlockhashAndFeeCalculator | undefined) => Promise<number>;
export declare const sendTransactionsWithRecentBlock: (connection: Connection, wallet: WalletSigner, instructionSet: TransactionInstruction[][], signersSet: Keypair[][], commitment?: Commitment) => Promise<number>;
export declare const sendTransaction: (connection: Connection, wallet: WalletSigner, instructions: TransactionInstruction[], signers: Keypair[], awaitConfirmation?: boolean, commitment?: Commitment, includesFeePayer?: boolean, block?: BlockhashAndFeeCalculator | undefined) => Promise<{
    txid: string;
    slot: number;
}>;
export declare const sendTransactionWithRetry: (connection: Connection, wallet: WalletSigner, instructions: TransactionInstruction[], signers: Keypair[], commitment?: Commitment, includesFeePayer?: boolean, block?: BlockhashAndFeeCalculator | undefined, beforeSend?: (() => void) | undefined) => Promise<{
    txid: string;
    slot: number;
}>;
export declare const getUnixTs: () => number;
export declare function sendSignedTransaction({ signedTransaction, connection, timeout, }: {
    signedTransaction: Transaction;
    connection: Connection;
    sendingMessage?: string;
    sentMessage?: string;
    successMessage?: string;
    timeout?: number;
}): Promise<{
    txid: string;
    slot: number;
}>;
export {};
//# sourceMappingURL=connection.d.ts.map