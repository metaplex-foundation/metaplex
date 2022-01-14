import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import {
  Commitment,
  Connection,
  Signer,
  Transaction,
  TransactionInstruction,
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
  error: Error,
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
    for (const [i, tx] of signedTXs.entries()) {
      await retry(
        async () => {
          const result = await sendSignedTransaction({
            connection: this.connection!,
            signedTransaction: tx,
          });
          if (result.err) throw result.err;

          this.onProgressCallback?.(i);
          if (result.slot >= slot + 150) {
            // Alright, this tx went fine but
            // we went out of slot in this tx. we need to re-sign the next txs.
            const nextTXs = signedTXs.slice(i + 1);

            if (nextTXs.length) {
              const results = await this.getSlotAndCurrentBlockHash();
              slot = results[0];
              currentBlock = results[1];

              // Reassign and re-sign lol
              nextTXs.forEach(tx => {
                tx.recentBlockhash = currentBlock.blockhash;
              });
              await this.wallet!.signAllTransactions(nextTXs);
              this.onReSignCallback?.(0, i);
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
                const results = await this.getSlotAndCurrentBlockHash();
                slot = results[0];
                currentBlock = results[1];
                signedTXs.forEach(tx => {
                  tx.recentBlockhash = currentBlock.blockhash;
                });
                await this.wallet!.signAllTransactions(signedTXs);
                this.onReSignCallback?.(attempt, i);
              }
            } else if (error?.type === 'misc-error') {
              // Other kinds of errors
              // TODO: Add handling?
            }
            this.onFailureCallback?.(error, i - 1, i, this.instructionSets![i]);
          },
        },
      );
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
