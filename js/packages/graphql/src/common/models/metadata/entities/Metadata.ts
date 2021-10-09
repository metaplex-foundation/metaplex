import { PublicKey } from '@solana/web3.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BaseEntity } from '../../BaseEntity';
import { programIds, StringPublicKey, toPublicKey } from '../../../utils';
import { METADATA_PREFIX, METADATA_REPLACE } from '../constants';
import { getEdition } from '../getEdition';
import { MetadataKey } from '../MetadataKey';
import { Data } from './Data';

@Serializable()
export class Metadata extends BaseEntity {
  @JsonProperty()
  key: MetadataKey = MetadataKey.MetadataV1;

  @JsonProperty()
  updateAuthority!: StringPublicKey;

  @JsonProperty()
  mint!: StringPublicKey;

  @JsonProperty()
  data!: Data;

  @JsonProperty()
  primarySaleHappened!: boolean;

  @JsonProperty()
  isMutable!: boolean;

  @JsonProperty()
  editionNonce!: number | null;

  // set lazy
  @JsonProperty()
  masterEdition?: StringPublicKey;

  @JsonProperty()
  edition?: StringPublicKey;

  constructor(args?: {
    updateAuthority: StringPublicKey;
    mint: StringPublicKey;
    data: Data;
    primarySaleHappened: boolean;
    isMutable: boolean;
    editionNonce: number | null;
  }) {
    super();

    if (args) {
      this.updateAuthority = args.updateAuthority;
      this.mint = args.mint;
      this.data = args.data;
      this.primarySaleHappened = args.primarySaleHappened;
      this.isMutable = args.isMutable;
      this.editionNonce = args.editionNonce;

      this.data.name = this.data.name.replace(METADATA_REPLACE, '');
      this.data.uri = this.data.uri.replace(METADATA_REPLACE, '');
      this.data.symbol = this.data.symbol.replace(METADATA_REPLACE, '');
    }
  }

  public async init() {
    const metadata = toPublicKey(programIds().metadata);
    if (this.editionNonce !== null) {
      this.edition = (
        await PublicKey.createProgramAddress(
          [
            Buffer.from(METADATA_PREFIX),
            metadata.toBuffer(),
            toPublicKey(this.mint).toBuffer(),
            new Uint8Array([this.editionNonce || 0]),
          ],
          metadata,
        )
      ).toBase58();
    } else {
      this.edition = await getEdition(this.mint);
    }
    this.masterEdition = this.edition;
  }
}
