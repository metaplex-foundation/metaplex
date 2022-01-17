import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import {
  Commitment,
  Connection,
  Signer,
  Transaction,
  TransactionInstruction,
  FeeCalculator,
} from '@solana/web3.js';
import retry from 'async-retry';
import { sendSignedTransaction } from '.';
import { WalletSigner } from './wallet';

export interface InstructionSet {
  signers: Signer[];
  instructions: TransactionInstruction[];
}

export type SmartInstructionSenderProgressCallback = (
  currentIndex: number,
) => void;
export type SmartInstructionSenderReSignCallback = (
  attempt: number,
  currentIndex: number,
) => void;
export type SmartInstructionSenderFailureCallback = (
  error: Error | any,
  successfulItems: number,
  currentIndex: number,
  instructionSet: InstructionSet,
) => void;

export interface SmartInstructionSenderConfig {
  maxSigningAttempts: number;
  abortOnFailure: boolean;
}

export class SmartInstructionSender {
  private connection?: Connection;
  private wallet?: WalletSigner;
  private instructionSets?: InstructionSet[];
  private commitment: Commitment = 'singleGossip';
  private config: SmartInstructionSenderConfig = {
    maxSigningAttempts: 3,
    abortOnFailure: true,
  };

  private onProgressCallback?: SmartInstructionSenderProgressCallback;
  private onReSignCallback?: SmartInstructionSenderReSignCallback;
  private onFailureCallback?: SmartInstructionSenderFailureCallback;

  private constructor() {}

  public static build() {
    return new SmartInstructionSender();
  }

  public withConnection = (connection: Connection) => {
    this.connection = connection;
    return this;
  };

  public withWallet = (wallet: WalletSigner) => {
    this.wallet = wallet;
    return this;
  };

  public withInstructionSets = (instructionSets: InstructionSet[]) => {
    this.instructionSets = instructionSets;
    return this;
  };

  public withConfig = (config: SmartInstructionSenderConfig) => {
    this.config = config;
    return this;
  };

  public withCommitment = (commitment: Commitment) => {
    this.commitment = commitment;
    return this;
  };

  public onProgress = (
    progressCallback: SmartInstructionSenderProgressCallback,
  ) => {
    this.onProgressCallback = progressCallback;
    return this;
  };

  public onReSign = (reSignCallback: SmartInstructionSenderReSignCallback) => {
    this.onReSignCallback = reSignCallback;
    return this;
  };

  public onFailure = (
    onFailureCallback: SmartInstructionSenderFailureCallback,
  ) => {
    this.onFailureCallback = onFailureCallback;
    return this;
  };

  private getSlotAndCurrentBlockHash() {
    if (!this.connection) {
      throw new Error('No connection provided');
    }
    return Promise.all([
      this.connection.getSlot(this.commitment),
      this.connection.getRecentBlockhash(this.commitment),
    ]);
  }

  private signAndRebuildTransactionsFromInstructionSets = async (
    signedTXs: Transaction[],
    index: number,
    blockhash: {
      blockhash: string;
      feeCalculator: FeeCalculator;
    },
    attempt: number = 0,
  ) => {
    this.onReSignCallback?.(attempt, index);
    for (let j = index; j < this.instructionSets!.length; j++) {
      const instructionSet = this.instructionSets![j];
      signedTXs[j] = new Transaction({
        feePayer: this.wallet!.publicKey,
        recentBlockhash: blockhash.blockhash,
      }).add(...instructionSet.instructions);
      if (instructionSet.signers.length)
        signedTXs[j].partialSign(...instructionSet.signers);
    }
    await this.wallet!.signAllTransactions(
      signedTXs.slice(index, signedTXs.length),
    );
    return signedTXs.slice(index, signedTXs.length)[0]; // Return current tx for convenience
  };

  public send = async () => {
    if (!this.connection) throw new Error('No connection provided');
    if (!this.wallet) throw new Error('No wallet provided');
    if (!this.wallet?.publicKey) throw new WalletNotConnectedError();
    if (!this.instructionSets?.length)
      throw new Error('No instruction sets provided');

    let [slot, currentBlock] = await this.getSlotAndCurrentBlockHash();

    const unsignedTXs = this.instructionSets
      .filter(i => i.instructions.length)
      .map(({ instructions, signers }) => {
        const tx = new Transaction({
          feePayer: this.wallet!.publicKey,
          recentBlockhash: currentBlock.blockhash,
        }).add(...instructions);
        if (signers.length) tx.partialSign(...signers);
        return tx;
      });

    const signedTXs = await this.wallet.signAllTransactions(unsignedTXs);
    let successfulItems = 0;
    for (let i = 0; i < signedTXs.length; i++) {
      let tx = signedTXs[i];
      let retryNumber = 0;
      try {
        await retry(
          async (bail: (reason: Error | any) => void) => {
            retryNumber++;

            await new Promise(resolve => setTimeout(resolve, 15000));

            const result = await sendSignedTransaction({
              connection: this.connection!,
              signedTransaction: tx,
            });

            if (result.err) {
              if (
                result.err.type === 'timeout' &&
                retryNumber >= this.config!.maxSigningAttempts
              ) {
                bail(new Error('MAX_RESIGN_ATTEMPTS_REACHED'));
                return;
              } else if (result.err.type === 'timeout') {
                // ⭐️ Throwing is good because it will be catched by the onRetry block
                // and will be retried.
                throw result.err;
              } else if (result.err.type === 'misc-error') {
                bail(result.err);
                return;
              } else {
                bail(result.err);
                return;
              }
            }

            this.onProgressCallback?.(i);
            successfulItems++;

            if (result.slot >= slot + 150) {
              const nextTXs = signedTXs.slice(i + 1);
              if (nextTXs.length) {
                const [newSlot, newCurrentBlock] =
                  await this.getSlotAndCurrentBlockHash();
                slot = newSlot;
                currentBlock = newCurrentBlock;
                await this.signAndRebuildTransactionsFromInstructionSets(
                  signedTXs,
                  i + 1,
                  newCurrentBlock,
                );
              }
            }
          },
          {
            retries: this.config.maxSigningAttempts,
            onRetry: async (error: any, attempt: number) => {
              if (error?.type === 'timeout') {
                const slotResult = await this.connection!.getSlot(
                  this.commitment,
                );
                if (slotResult >= slot + 150) {
                  const [newSlot, newCurrentBlock] =
                    await this.getSlotAndCurrentBlockHash();
                  slot = newSlot;
                  currentBlock = newCurrentBlock;
                  tx = await this.signAndRebuildTransactionsFromInstructionSets(
                    signedTXs,
                    i,
                    newCurrentBlock,
                    attempt,
                  );
                }
              }
            },
          },
        );
      } catch (error) {
        this.onFailureCallback?.(
          error,
          i,
          successfulItems,
          this.instructionSets[successfulItems - 1],
        );
        if (this.config.abortOnFailure) {
          break;
        }
      }
    }
  };
}
