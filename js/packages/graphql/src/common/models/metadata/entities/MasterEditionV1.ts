import BN from 'bn.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BaseEntity } from '../../BaseEntity';
import { BNConverter } from '../../serialize';
import { StringPublicKey } from '../../../utils';
import { MetadataKey } from '../MetadataKey';

@Serializable()
export class MasterEditionV1 extends BaseEntity {
  @JsonProperty()
  key: MetadataKey = MetadataKey.MasterEditionV1;

  @JsonProperty(BNConverter)
  supply!: BN;

  @JsonProperty(BNConverter)
  maxSupply?: BN;
  /// Can be used to mint tokens that give one-time permission to mint a single limited edition.
  @JsonProperty()
  printingMint!: StringPublicKey;
  /// If you don't know how many printing tokens you are going to need, but you do know
  /// you are going to need some amount in the future, you can use a token from this mint.
  /// Coming back to token metadata with one of these tokens allows you to mint (one time)
  /// any number of printing tokens you want. This is used for instance by Auction Manager
  /// with participation NFTs, where we dont know how many people will bid and need participation
  /// printing tokens to redeem, so we give it ONE of these tokens to use after the auction is over,
  /// because when the auction begins we just dont know how many printing tokens we will need,
  /// but at the end we will. At the end it then burns this token with token-metadata to
  /// get the printing tokens it needs to give to bidders. Each bidder then redeems a printing token
  /// to get their limited editions.
  @JsonProperty()
  oneTimePrintingAuthorizationMint!: StringPublicKey;

  constructor(args?: {
    _id?: StringPublicKey;
    supply: BN;
    maxSupply?: BN;
    printingMint: StringPublicKey;
    oneTimePrintingAuthorizationMint: StringPublicKey;
  }) {
    super(args);
  }
}
