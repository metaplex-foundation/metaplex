import { PublicKey } from '@solana/web3.js';
import { JsonProperty, Serializable } from 'typescript-json-serializer';
import { BaseEntity } from '../../BaseEntity';
import { programIds, StringPublicKey, toPublicKey } from '../../../utils';
import { METADATA_PREFIX, METADATA_REPLACE } from '../constants';
import { getEdition } from '../getEdition';
import { MetadataKey } from '../MetadataKey';
import { Data } from './Data';
import { getEditionList } from '../../../../../ingester/index';
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
    _id?: StringPublicKey;
    updateAuthority: StringPublicKey;
    mint: StringPublicKey;
    data: Data;
    primarySaleHappened: boolean;
    isMutable: boolean;
    editionNonce?: number | null;
    edition?: StringPublicKey;
  }) {
    super(args);
    if (args) {
      const data = args.data;
      this.data = new Data({
        ...data,
        name: data.name.replace(METADATA_REPLACE, ''),
        uri: data.uri.replace(METADATA_REPLACE, ''),
        symbol: data.symbol.replace(METADATA_REPLACE, ''),
      });
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

  static async initBatch(list: IterableIterator<Metadata>) {
    const toCreate: Metadata[] = [];
    const toFind: Metadata[] = [];
    for (const m of list) {
      if (m.editionNonce !== null) {
        toCreate.push(m);
      } else {
        toFind.push(m);
      }
    }

    const findPromise = getEditionList(toFind.map(m => m.mint)).toStream(
      item => {
        const edition: string = item[0];
        const findItem = toFind.find(p => p.mint === item[3]);
        if (findItem) {
          findItem.edition = edition;
        }
      },
    );
    const metadata = toPublicKey(programIds().metadata);
    const defers = toCreate.map(item =>
      PublicKey.createProgramAddress(
        [
          Buffer.from(METADATA_PREFIX),
          metadata.toBuffer(),
          toPublicKey(item.mint).toBuffer(),
          new Uint8Array([item.editionNonce || 0]),
        ],
        metadata,
      )
        .then(buf => {
          item.edition = buf.toBase58();
        })
        .catch(() => {}),
    );
    await Promise.all(defers);
    /*
    const createPromise = createProgramAddressEdition(
      toCreate.map(p => p.mint),
      toCreate.map(p => p.editionNonce!),
    ).toStream(item => {
      const edition: string = item[0];
      const findItem = toFind.find(p => p.mint === item[3]);
      if (findItem) {
        findItem.edition = edition;
      }
    });
    */
    await findPromise;
  }
}
