import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BaseEntity } from '../../BaseEntity';
import type { StringPublicKey } from '../../../utils';
import { VaultKey } from '../VaultKey';
@Serializable()
export class SafetyDepositBox extends BaseEntity {
  /// Each token type in a vault has it's own box that contains it's mint and a look-back
  @JsonProperty()
  key: VaultKey;

  /// VaultKey pointing to the parent vault
  @JsonProperty()
  vault!: StringPublicKey;

  /// This particular token's mint
  @JsonProperty()
  tokenMint!: StringPublicKey;

  /// Account that stores the tokens under management
  @JsonProperty()
  store!: StringPublicKey;

  /// the order in the array of registries
  @JsonProperty()
  order!: number;

  constructor(args?: {
    vault: StringPublicKey;
    tokenMint: StringPublicKey;
    store: StringPublicKey;
    order: number;
  }) {
    super();

    this.key = VaultKey.SafetyDepositBoxV1;
    if (args) {
      this.vault = args.vault;
      this.tokenMint = args.tokenMint;
      this.store = args.store;
      this.order = args.order;
    }
  }
}
