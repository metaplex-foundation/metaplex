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

interface InstructionSet {
  signers: Signer[];
  instructions: TransactionInstruction[];
}

type SmartInstructionSenderProgressCallback = (currentIndex: number) => void;
type SmartInstructionSenderReSignCallback = (
  attempt: number,
  currentIndex: number,
) => void;
type SmartInstructionSenderFailureCallback = (
  error: Error | any,
  successfulItems: number,
  currentIndex: number,
  instructionSet: InstructionSet,
) => void;

export class SmartInstructionSender {
  private connection?: Connection;
  private wallet?: WalletSigner;
  private instructionSets?: InstructionSet[];
  private commitment: Commitment = 'singleGossip';
  private config?: {
    maxSigningAttempts: number;
    transactionTimeout: number;
  };

  private onProgressCallback?: SmartInstructionSenderProgressCallback;
  private onReSignCallback?: SmartInstructionSenderReSignCallback;
  private onFailureCallback?: SmartInstructionSenderFailureCallback;

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

  public withConfig = (config: {
    maxSigningAttempts: number;
    transactionTimeout: number;
  }) => {
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

  private signAndrebuildTransactionsFromIntructionSets = async (
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
  };

  public send = async () => {
    if (!this.connection) throw new Error('No connection provided');
    if (!this.wallet) throw new Error('No wallet provided');
    if (!this.wallet?.publicKey) throw new WalletNotConnectedError();
    if (!this.instructionSets?.length)
      throw new Error('No instruction sets provided');
    if (!this.config) throw new Error('No config provided');

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
    let successfullItems = 0;
    for (const [i, tx] of signedTXs.entries()) {
      let retryNumber = 0;
      try {
        await retry(
          async (bail: (reason: Error | any) => void) => {
            retryNumber++;
            const result = await sendSignedTransaction({
              connection: this.connection!,
              signedTransaction: tx,
            });
            if (result.err) {
              if (
                result.err.type === 'tx-error' &&
                retryNumber >= this.config!.maxSigningAttempts
              ) {
                bail(new Error('MAX_RESIGN_ATTEMPTS_REACHED'));
                return;
              } else if (result.err.type === 'tx-error') {
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
            successfullItems++;

            if (result.slot >= slot + 150) {
              const nextTXs = signedTXs.slice(i + 1);
              if (nextTXs.length) {
                const [newSlot, newCurrentBlock] =
                  await this.getSlotAndCurrentBlockHash();
                slot = newSlot;
                currentBlock = newCurrentBlock;
                await this.signAndrebuildTransactionsFromIntructionSets(
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
              if (error?.type === 'tx-error') {
                const slotResult = await this.connection!.getSlot(
                  this.commitment,
                );
                if (slotResult >= slot + 150) {
                  const [newSlot, newCurrentBlock] =
                    await this.getSlotAndCurrentBlockHash();
                  slot = newSlot;
                  currentBlock = newCurrentBlock;
                  await this.signAndrebuildTransactionsFromIntructionSets(
                    signedTXs,
                    i + 1,
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
          successfullItems,
          this.instructionSets[successfullItems - 1],
        );
        break;
      }
    }
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
}
