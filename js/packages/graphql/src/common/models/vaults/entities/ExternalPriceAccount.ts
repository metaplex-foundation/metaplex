import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { StringPublicKey } from '../../../utils';
import { VaultKey } from '../VaultKey';

@Serializable()
export class ExternalPriceAccount {
  @JsonProperty()
  key: VaultKey;

  @JsonProperty()
  pricePerShare: BN;

  /// Mint of the currency we are pricing the shares against, should be same as redeem_treasury.
  /// Most likely will be USDC mint most of the time.
  @JsonProperty()
  priceMint: StringPublicKey;

  /// Whether or not combination has been allowed for this vault.
  @JsonProperty()
  allowedToCombine: boolean;

  constructor(args: {
    pricePerShare: BN;
    priceMint: StringPublicKey;
    allowedToCombine: boolean;
  }) {
    this.key = VaultKey.ExternalPriceAccountV1;
    this.pricePerShare = args.pricePerShare;
    this.priceMint = args.priceMint;
    this.allowedToCombine = args.allowedToCombine;
  }
}
