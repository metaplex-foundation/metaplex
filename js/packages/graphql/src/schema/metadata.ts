import { objectType, enumType, unionType } from 'nexus';

export const MetadataKey = enumType({
  name: 'MetadataKey',
  members: {
    Uninitialized: 0,
    MetadataV1: 4,
    EditionV1: 1,
    MasterEditionV1: 2,
    MasterEditionV2: 6,
    EditionMarker: 7,
  },
});

export const Edition = objectType({
  name: 'Edition',
  definition(t) {
    t.field('key', { type: MetadataKey });
    t.pubkey('parent', {
      description: 'Points at MasterEdition struct',
    });
    t.bn('edition', {
      description:
        'Starting at 0 for master record, this is incremented for each edition minted',
    });
  },
});

export const MasterEditionV1 = objectType({
  name: 'MasterEditionV1',
  definition(t) {
    t.field('key', { type: MetadataKey });
    t.bn('supply');
    t.bn('maxSupply');
    t.pubkey('printingMint');
    t.pubkey('oneTimePrintingAuthorizationMint');
  },
});

export const MasterEditionV2 = objectType({
  name: 'MasterEditionV2',
  definition(t) {
    t.field('key', { type: MetadataKey });
    t.bn('supply');
    t.bn('maxSupply');
  },
});

export const MasterEdition = unionType({
  name: 'MasterEdition',
  resolveType(obj) {
    if ('printingMint' in obj) {
      return 'MasterEditionV1';
    }
    return 'MasterEditionV2';
  },
  definition(t) {
    t.members(MasterEditionV1, MasterEditionV2);
  },
});
