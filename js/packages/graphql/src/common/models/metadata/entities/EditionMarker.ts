import { EDITION_MARKER_BIT_SIZE } from '../../vaults/constants';
import { MetadataKey } from '../MetadataKey';
import { JsonProperty } from 'typescript-json-serializer';

import { BaseEntity } from '../../BaseEntity';
export class EditionMarker extends BaseEntity {
  @JsonProperty()
  key: MetadataKey = MetadataKey.EditionMarker;

  @JsonProperty()
  ledger!: number[];

  constructor(args?: { key: MetadataKey; ledger: number[] }) {
    super();
    if (args) {
      this.key = args?.key ?? MetadataKey.EditionMarker;
      this.ledger = args.ledger;
    }
  }

  editionTaken(edition: number) {
    const editionOffset = edition % EDITION_MARKER_BIT_SIZE;
    const indexOffset = Math.floor(editionOffset / 8);

    if (indexOffset > 30) {
      throw Error('bad index for edition');
    }

    const positionInBitsetFromRight = 7 - (editionOffset % 8);

    const mask = Math.pow(2, positionInBitsetFromRight);

    const appliedMask = this.ledger[indexOffset] & mask;

    return appliedMask != 0;
  }
}
