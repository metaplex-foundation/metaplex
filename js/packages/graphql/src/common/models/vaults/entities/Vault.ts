import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BaseEntity } from '../../BaseEntity';
import { BNConverter } from '../../serialize';
import { StringPublicKey } from '../../../utils';
import { VaultKey } from '../VaultKey';
import { VaultState } from '../VaultState';

@Serializable()
export class Vault extends BaseEntity {
  @JsonProperty()
  key!: VaultKey;

  /// Store token program used
  @JsonProperty()
  tokenProgram!: StringPublicKey;

  /// Mint that produces the fractional shares
  @JsonProperty()
  fractionMint!: StringPublicKey;

  /// Authority who can make changes to the vault
  @JsonProperty()
  authority!: StringPublicKey;

  /// treasury where fractional shares are held for redemption by authority
  @JsonProperty()
  fractionTreasury!: StringPublicKey;

  /// treasury where monies are held for fractional share holders to redeem(burn) shares once buyout is made
  @JsonProperty()
  redeemTreasury!: StringPublicKey;

  /// Can authority mint more shares from fraction_mint after activation
  @JsonProperty()
  allowFurtherShareCreation!: boolean;

  /// Must point at an ExternalPriceAccount, which gives permission and price for buyout.
  @JsonProperty()
  pricingLookupAddress!: StringPublicKey;

  /// In inactive state, we use this to set the order key on Safety Deposit Boxes being added and
  /// then we increment it and save so the next safety deposit box gets the next number.
  /// In the Combined state during token redemption by authority, we use it as a decrementing counter each time
  /// The authority of the vault withdrawals a Safety Deposit contents to count down how many
  /// are left to be opened and closed down. Once this hits zero, and the fraction mint has zero shares,
  /// then we can deactivate the vault.
  @JsonProperty()
  tokenTypeCount!: number;

  @JsonProperty()
  state!: VaultState;

  /// Once combination happens, we copy price per share to vault so that if something nefarious happens
  /// to external price account, like price change, we still have the math 'saved' for use in our calcs
  @JsonProperty(BNConverter)
  lockedPricePerShare!: BN;

  constructor(args?: {
    tokenProgram: StringPublicKey;
    fractionMint: StringPublicKey;
    authority: StringPublicKey;
    fractionTreasury: StringPublicKey;
    redeemTreasury: StringPublicKey;
    allowFurtherShareCreation: boolean;
    pricingLookupAddress: StringPublicKey;
    tokenTypeCount: number;
    state: VaultState;
    lockedPricePerShare: BN;
  }) {
    super();

    this.key = VaultKey.VaultV1;
    if (args) {
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
}
