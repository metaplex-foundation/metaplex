import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { StringPublicKey } from '../../../utils';
import { MetaplexKey } from '../MetaplexKey';
import { BaseEntity } from '../../BaseEntity';

@Serializable()
export class Store extends BaseEntity {
  @JsonProperty()
  key: MetaplexKey = MetaplexKey.StoreV1;

  @JsonProperty()
  public: boolean = true;

  @JsonProperty()
  auctionProgram!: StringPublicKey;

  @JsonProperty()
  tokenVaultProgram!: StringPublicKey;

  @JsonProperty()
  tokenMetadataProgram!: StringPublicKey;

  @JsonProperty()
  tokenProgram!: StringPublicKey;

  @JsonProperty()
  creatorIds: StringPublicKey[] = [];

  constructor(args?: {
    _id?: StringPublicKey;
    public: boolean;
    auctionProgram: StringPublicKey;
    tokenVaultProgram: StringPublicKey;
    tokenMetadataProgram: StringPublicKey;
    tokenProgram: StringPublicKey;
    creatorIds?: StringPublicKey[];
  }) {
    super({
      ...args,
      creatorIds: args?.creatorIds ?? [],
    });
  }
}
