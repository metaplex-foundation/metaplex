import {
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from '@solana/web3.js';
import { programIds } from '../utils/ids';
import { deserializeUnchecked, serialize } from 'borsh';
import BN from 'bn.js';

export const VAULT_PREFIX = 'vault';
export enum VaultKey {
  VaultV1 = 0,
  SafetyDepositBoxV1 = 1,
  ExternalPriceAccountV1 = 2,
}

export enum VaultState {
  Inactive = 0,
  Active = 1,
  Combined = 2,
  Deactivated = 3,
}

export const MAX_VAULT_SIZE =
  1 + 32 + 32 + 32 + 32 + 1 + 32 + 1 + 32 + 1 + 1 + 8;

export const MAX_EXTERNAL_ACCOUNT_SIZE = 1 + 8 + 32 + 1;
export class Vault {
  key: VaultKey;
  /// Store token program used
  tokenProgram: PublicKey;
  /// Mint that produces the fractional shares
  fractionMint: PublicKey;
  /// Authority who can make changes to the vault
  authority: PublicKey;
  /// treasury where fractional shares are held for redemption by authority
  fractionTreasury: PublicKey;
  /// treasury where monies are held for fractional share holders to redeem(burn) shares once buyout is made
  redeemTreasury: PublicKey;
  /// Can authority mint more shares from fraction_mint after activation
  allowFurtherShareCreation: boolean;

  /// Must point at an ExternalPriceAccount, which gives permission and price for buyout.
  pricingLookupAddress: PublicKey;
  /// In inactive state, we use this to set the order key on Safety Deposit Boxes being added and
  /// then we increment it and save so the next safety deposit box gets the next number.
  /// In the Combined state during token redemption by authority, we use it as a decrementing counter each time
  /// The authority of the vault withdrawals a Safety Deposit contents to count down how many
  /// are left to be opened and closed down. Once this hits zero, and the fraction mint has zero shares,
  /// then we can deactivate the vault.
  tokenTypeCount: number;
  state: VaultState;

  /// Once combination happens, we copy price per share to vault so that if something nefarious happens
  /// to external price account, like price change, we still have the math 'saved' for use in our calcs
  lockedPricePerShare: BN;

  constructor(args: {
    tokenProgram: PublicKey;
    fractionMint: PublicKey;
    authority: PublicKey;
    fractionTreasury: PublicKey;
    redeemTreasury: PublicKey;
    allowFurtherShareCreation: boolean;
    pricingLookupAddress: PublicKey;
    tokenTypeCount: number;
    state: VaultState;
    lockedPricePerShare: BN;
  }) {
    this.key = VaultKey.VaultV1;
    this.tokenProgram = args.tokenProgram;
    this.fractionMint = args.fractionMint;
    this.authority = args.authority;
    this.fractionTreasury = args.fractionTreasury;
    this.redeemTreasury = args.redeemTreasury;
    this.allowFurtherShareCreation = args.allowFurtherShareCreation;
    this.pricingLookupAddress = args.pricingLookupAddress;
    this.tokenTypeCount = args.tokenTypeCount;
    this.state = args.state;
    this.lockedPricePerShare = args.lockedPricePerShare;
  }
}
export class SafetyDepositBox {
  /// Each token type in a vault has it's own box that contains it's mint and a look-back
  key: VaultKey;
  /// VaultKey pointing to the parent vault
  vault: PublicKey;
  /// This particular token's mint
  tokenMint: PublicKey;
  /// Account that stores the tokens under management
  store: PublicKey;
  /// the order in the array of registries
  order: number;

  constructor(args: {
    vault: PublicKey;
    tokenMint: PublicKey;
    store: PublicKey;
    order: number;
  }) {
    this.key = VaultKey.SafetyDepositBoxV1;
    this.vault = args.vault;
    this.tokenMint = args.tokenMint;
    this.store = args.store;
    this.order = args.order;
  }
}

export class ExternalPriceAccount {
  key: VaultKey;
  pricePerShare: BN;
  /// Mint of the currency we are pricing the shares against, should be same as redeem_treasury.
  /// Most likely will be USDC mint most of the time.
  priceMint: PublicKey;
  /// Whether or not combination has been allowed for this vault.
  allowedToCombine: boolean;

  constructor(args: {
    pricePerShare: BN;
    priceMint: PublicKey;
    allowedToCombine: boolean;
  }) {
    this.key = VaultKey.ExternalPriceAccountV1;
    this.pricePerShare = args.pricePerShare;
    this.priceMint = args.priceMint;
    this.allowedToCombine = args.allowedToCombine;
  }
}

class InitVaultArgs {
  instruction: number = 0;
  allowFurtherShareCreation: boolean = false;

  constructor(args: { allowFurtherShareCreation: boolean }) {
    this.allowFurtherShareCreation = args.allowFurtherShareCreation;
  }
}

class AmountArgs {
  instruction: number;
  amount: BN;

  constructor(args: { instruction: number; amount: BN }) {
    this.instruction = args.instruction;
    this.amount = args.amount;
  }
}

class NumberOfShareArgs {
  instruction: number;
  numberOfShares: BN;

  constructor(args: { instruction: number; numberOfShares: BN }) {
    this.instruction = args.instruction;
    this.numberOfShares = args.numberOfShares;
  }
}

class UpdateExternalPriceAccountArgs {
  instruction: number = 9;
  externalPriceAccount: ExternalPriceAccount;

  constructor(args: { externalPriceAccount: ExternalPriceAccount }) {
    this.externalPriceAccount = args.externalPriceAccount;
  }
}

export const VAULT_SCHEMA = new Map<any, any>([
  [
    InitVaultArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['allowFurtherShareCreation', 'u8'],
      ],
    },
  ],
  [
    AmountArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['amount', 'u64'],
      ],
    },
  ],
  [
    NumberOfShareArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['numberOfShares', 'u64'],
      ],
    },
  ],
  [
    UpdateExternalPriceAccountArgs,
    {
      kind: 'struct',
      fields: [
        ['instruction', 'u8'],
        ['externalPriceAccount', ExternalPriceAccount],
      ],
    },
  ],
  [
    Vault,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['tokenProgram', 'pubkey'],
        ['fractionMint', 'pubkey'],
        ['authority', 'pubkey'],
        ['fractionTreasury', 'pubkey'],
        ['redeemTreasury', 'pubkey'],
        ['allowFurtherShareCreation', 'u8'],
        ['pricingLookupAddress', 'u8'],
        ['tokenTypeCount', 'u8'],
        ['state', 'u8'],
        ['lockedPricePerShare', 'u64'],
      ],
    },
  ],
  [
    SafetyDepositBox,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['vault', 'pubkey'],
        ['tokenMint', 'pubkey'],
        ['store', 'pubkey'],
        ['order', 'u8'],
      ],
    },
  ],
  [
    ExternalPriceAccount,
    {
      kind: 'struct',
      fields: [
        ['key', 'u8'],
        ['pricePerShare', 'u64'],
        ['priceMint', 'pubkey'],
        ['allowedToCombine', 'u8'],
      ],
    },
  ],
]);

export const decodeVault = (buffer: Buffer) => {
  return deserializeUnchecked(VAULT_SCHEMA, Vault, buffer) as Vault;
};

export const decodeSafetyDeposit = (buffer: Buffer) => {
  return deserializeUnchecked(
    VAULT_SCHEMA,
    SafetyDepositBox,
    buffer,
  ) as SafetyDepositBox;
};

export async function initVault(
  allowFurtherShareCreation: boolean,
  fractionalMint: PublicKey,
  redeemTreasury: PublicKey,
  fractionalTreasury: PublicKey,
  vault: PublicKey,
  vaultAuthority: PublicKey,
  pricingLookupAddress: PublicKey,
  instructions: TransactionInstruction[],
) {
  const vaultProgramId = programIds().vault;

  const data = Buffer.from(
    serialize(VAULT_SCHEMA, new InitVaultArgs({ allowFurtherShareCreation })),
  );

  const keys = [
    {
      pubkey: fractionalMint,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: redeemTreasury,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: fractionalTreasury,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: vault,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: vaultAuthority,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: pricingLookupAddress,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },

    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: vaultProgramId,
      data: data,
    }),
  );
}

export async function getSafetyDepositBox(
  vault: PublicKey,
  tokenMint: PublicKey,
): Promise<PublicKey> {
  const vaultProgramId = programIds().vault;

  return (
    await PublicKey.findProgramAddress(
      [Buffer.from(VAULT_PREFIX), vault.toBuffer(), tokenMint.toBuffer()],
      vaultProgramId,
    )
  )[0];
}

export async function addTokenToInactiveVault(
  amount: BN,
  tokenMint: PublicKey,
  tokenAccount: PublicKey,
  tokenStoreAccount: PublicKey,
  vault: PublicKey,
  vaultAuthority: PublicKey,
  payer: PublicKey,
  transferAuthority: PublicKey,
  instructions: TransactionInstruction[],
) {
  const vaultProgramId = programIds().vault;

  const safetyDepositBox: PublicKey = await getSafetyDepositBox(
    vault,
    tokenMint,
  );

  const value = new AmountArgs({
    instruction: 1,
    amount,
  });

  const data = Buffer.from(serialize(VAULT_SCHEMA, value));
  const keys = [
    {
      pubkey: safetyDepositBox,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: tokenAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: tokenStoreAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: vault,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: vaultAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: payer,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: transferAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SystemProgram.programId,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: vaultProgramId,
      data,
    }),
  );
}

export async function activateVault(
  numberOfShares: BN,
  vault: PublicKey,
  fractionMint: PublicKey,
  fractionTreasury: PublicKey,
  vaultAuthority: PublicKey,
  instructions: TransactionInstruction[],
) {
  const vaultProgramId = programIds().vault;

  const fractionMintAuthority = (
    await PublicKey.findProgramAddress(
      [Buffer.from(VAULT_PREFIX), vaultProgramId.toBuffer()],
      vaultProgramId,
    )
  )[0];

  const value = new NumberOfShareArgs({ instruction: 2, numberOfShares });
  const data = Buffer.from(serialize(VAULT_SCHEMA, value));

  const keys = [
    {
      pubkey: vault,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: fractionMint,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: fractionTreasury,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: fractionMintAuthority,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vaultAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: vaultProgramId,
      data,
    }),
  );
}

export async function combineVault(
  vault: PublicKey,
  outstandingShareTokenAccount: PublicKey,
  payingTokenAccount: PublicKey,
  fractionMint: PublicKey,
  fractionTreasury: PublicKey,
  redeemTreasury: PublicKey,
  newVaultAuthority: PublicKey | undefined,
  vaultAuthority: PublicKey,
  transferAuthority: PublicKey,
  externalPriceAccount: PublicKey,
  instructions: TransactionInstruction[],
) {
  const vaultProgramId = programIds().vault;

  const burnAuthority = (
    await PublicKey.findProgramAddress(
      [Buffer.from(VAULT_PREFIX), vaultProgramId.toBuffer()],
      vaultProgramId,
    )
  )[0];

  const data = Buffer.from([3]);

  const keys = [
    {
      pubkey: vault,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: outstandingShareTokenAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: payingTokenAccount,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: fractionMint,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: fractionTreasury,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: redeemTreasury,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: newVaultAuthority || vaultAuthority,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: vaultAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: transferAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: burnAuthority,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: externalPriceAccount,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: vaultProgramId,
      data,
    }),
  );
}

export async function withdrawTokenFromSafetyDepositBox(
  amount: BN,
  destination: PublicKey,
  safetyDepositBox: PublicKey,
  storeKey: PublicKey,
  vault: PublicKey,
  fractionMint: PublicKey,
  vaultAuthority: PublicKey,
  instructions: TransactionInstruction[],
) {
  const vaultProgramId = programIds().vault;

  const transferAuthority = (
    await PublicKey.findProgramAddress(
      [Buffer.from(VAULT_PREFIX), vaultProgramId.toBuffer()],
      vaultProgramId,
    )
  )[0];

  const value = new AmountArgs({ instruction: 5, amount });
  const data = Buffer.from(serialize(VAULT_SCHEMA, value));

  const keys = [
    {
      pubkey: destination,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: safetyDepositBox,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: storeKey,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: vault,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: fractionMint,
      isSigner: false,
      isWritable: true,
    },
    {
      pubkey: vaultAuthority,
      isSigner: true,
      isWritable: false,
    },
    {
      pubkey: transferAuthority,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: programIds().token,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: SYSVAR_RENT_PUBKEY,
      isSigner: false,
      isWritable: false,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: vaultProgramId,
      data,
    }),
  );
}

export async function updateExternalPriceAccount(
  externalPriceAccountKey: PublicKey,
  externalPriceAccount: ExternalPriceAccount,
  instructions: TransactionInstruction[],
) {
  const vaultProgramId = programIds().vault;

  const value = new UpdateExternalPriceAccountArgs({ externalPriceAccount });
  const data = Buffer.from(serialize(VAULT_SCHEMA, value));
  console.log('Data', data);

  const keys = [
    {
      pubkey: externalPriceAccountKey,
      isSigner: false,
      isWritable: true,
    },
  ];
  instructions.push(
    new TransactionInstruction({
      keys,
      programId: vaultProgramId,
      data,
    }),
  );
}

export async function getSafetyDepositBoxAddress(
  vault: PublicKey,
  tokenMint: PublicKey,
): Promise<PublicKey> {
  const PROGRAM_IDS = programIds();
  return (
    await PublicKey.findProgramAddress(
      [Buffer.from(VAULT_PREFIX), vault.toBuffer(), tokenMint.toBuffer()],
      PROGRAM_IDS.vault,
    )
  )[0];
}
