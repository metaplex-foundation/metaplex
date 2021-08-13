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
    t.field('key', { type: MetadataKey }); // Int
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

export const Metadata = objectType({
  name: 'Metadata',
  definition(t) {
    t.field('key', { type: MetadataKey });
    t.field('data', { type: Data });
    t.pubkey('updateAuthority');
    t.pubkey('mint');
    t.boolean('primarySaleHappened');
    t.boolean('isMutable');
    t.pubkey('edition');
    t.pubkey('masterEdition');
  },
});

export const Data = objectType({
  name: 'Data',
  definition(t) {
    t.string('name');
    t.string('symbol');
    t.string('uri');
    t.int('sellerFeeBasisPoints');
    t.list.field('creators', { type: Creator });
  },
});

export const Creator = objectType({
  name: 'Creator',
  definition(t) {
    t.pubkey('address');
    t.boolean('verified');
    t.int('share');
  },
});
