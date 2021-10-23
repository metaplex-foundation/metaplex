import { MintInfo, MintLayout, u64, AccountInfo as TokenAccountInfo } from '@solana/spl-token';
import { AccountInfo, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export const deserializeMint = (data: Buffer) => {
  if (data.length !== MintLayout.span) {
    throw new Error('Not a valid Mint');
  }

  const mintInfo = MintLayout.decode(data);

  if (mintInfo.mintAuthorityOption === 0) {
    mintInfo.mintAuthority = null;
  } else {
    mintInfo.mintAuthority = new PublicKey(mintInfo.mintAuthority);
  }

  mintInfo.supply = u64.fromBuffer(mintInfo.supply);
  mintInfo.isInitialized = mintInfo.isInitialized !== 0;

  if (mintInfo.freezeAuthorityOption === 0) {
    mintInfo.freezeAuthority = null;
  } else {
    mintInfo.freezeAuthority = new PublicKey(mintInfo.freezeAuthority);
  }

  return mintInfo as MintInfo;
};

export interface TokenAccount {
    pubkey: string;
    account: AccountInfo<Buffer>;
    info: TokenAccountInfo;
  }


export function fromLamports(
    account?: TokenAccount | number | BN,
    mint?: MintInfo,
    rate: number = 1.0,
  ): number {
    if (!account) {
      return 0;
    }

    const amount = Math.floor(
      typeof account === 'number'
        ? account
        : BN.isBN(account)
        ? account.toNumber()
        : account.info.amount.toNumber(),
    );

    const precision = Math.pow(10, mint?.decimals || 9);
    return (amount / precision) * rate;
  }