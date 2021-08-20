import EventEmitter from 'eventemitter3';
import { PublicKey, Transaction } from '@solana/web3.js';
import { notify } from '../../utils/notifications';
import { WalletAdapter } from '@solana/wallet-base';

interface SolflareWalletEvents {
  connect: (...args: unknown[]) => unknown;
  disconnect: (...args: unknown[]) => unknown;
}

interface SolflareWallet extends EventEmitter<SolflareWalletEvents> {
  isSolflare?: boolean;
  publicKey?: { toBuffer(): Buffer };
  isConnected: boolean;
  autoApprove: boolean;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  connect: () => Promise<boolean>;
  disconnect: () => Promise<boolean>;
}

interface SolflareWindow extends Window {
  solflare?: SolflareWallet;
}

declare const window: SolflareWindow;

export class SolflareWalletAdapter
  extends EventEmitter
  implements WalletAdapter {

  _wallet: SolflareWallet | undefined;
  _publicKey: PublicKey | undefined;

  constructor() {
    super();
    this.connect = this.connect.bind(this);
  }

  get connected() {
    return !!this._wallet?.isConnected;
  }

  get autoApprove() {
    return !!this._wallet?.autoApprove;
  }

  async signAllTransactions(
    transactions: Transaction[],
  ): Promise<Transaction[]> {
    if (!this._wallet) {
      return transactions;
    }

    return this._wallet.signAllTransactions(transactions);
  }

  get publicKey() {
    if (!this._publicKey && this._wallet?.publicKey)
      this._publicKey = new PublicKey(
        this._wallet.publicKey.toBuffer(),
      );

    return this._publicKey || null;
  }

  async signTransaction(transaction: Transaction) {
    if (!this._wallet) {
      return transaction;
    }

    return this._wallet.signTransaction(transaction);
  }

  connect = async () => {
    if (this._wallet) {
      return;
    }

    let wallet: SolflareWallet;
    if (window.solflare?.isSolflare) {
      wallet = window.solflare;
    } else {
      window.open('https://solflare.com', '_blank');
      notify({
        message: 'Solflare Error',
        description: 'Please install Solflare wallet',
      });
      return;
    }

    wallet.on('connect', () => {
      this._wallet = wallet;
      this.emit('connect');
    });

    if (!wallet.isConnected) {
      await wallet.connect();
    }

    this._wallet = wallet;
    this.emit('connect');
  };

  disconnect() {
    if (this._wallet) {
      this._wallet.disconnect();
      this._wallet = undefined;
      this.emit('disconnect');
    }
  }
}
