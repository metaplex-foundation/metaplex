import {
  AmountArgs,
  ExternalPriceAccount,
  InitVaultArgs,
  NumberOfShareArgs,
  SafetyDepositBox,
  UpdateExternalPriceAccountArgs,
  Vault,
} from './entities';

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
        ['tokenProgram', 'pubkeyAsString'],
        ['fractionMint', 'pubkeyAsString'],
        ['authority', 'pubkeyAsString'],
        ['fractionTreasury', 'pubkeyAsString'],
        ['redeemTreasury', 'pubkeyAsString'],
        ['allowFurtherShareCreation', 'u8'],
        ['pricingLookupAddress', 'pubkeyAsString'],
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
        ['vault', 'pubkeyAsString'],
        ['tokenMint', 'pubkeyAsString'],
        ['store', 'pubkeyAsString'],
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
        ['priceMint', 'pubkeyAsString'],
        ['allowedToCombine', 'u8'],
      ],
    },
  ],
]);
