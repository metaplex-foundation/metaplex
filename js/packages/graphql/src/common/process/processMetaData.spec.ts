import { Edition, MasterEditionV2, Metadata } from '../models';
import { METADATA_PROCESSOR } from './processMetaData';
import { extendBorsh } from '../utils';
extendBorsh();

const { processors, process: processMetaData } = METADATA_PROCESSOR;

describe('processMetaData', () => {
  const METADATA = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          4, 147, 180, 78, 231, 209, 46, 101, 140, 170, 106, 194, 3, 175, 127,
          110, 205, 196, 102, 63, 226, 244, 231, 21, 105, 117, 189, 77, 41, 72,
          169, 55, 223, 110, 90, 154, 182, 170, 119, 210, 213, 209, 147, 109,
          13, 149, 151, 231, 171, 77, 59, 112, 20, 128, 188, 174, 236, 84, 45,
          109, 60, 95, 184, 182, 239, 32, 0, 0, 0, 75, 79, 68, 65, 77, 65, 48,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 10, 0, 0, 0, 75, 79, 68, 65, 77, 65, 0, 0, 0, 0, 200, 0, 0, 0,
          104, 116, 116, 112, 115, 58, 47, 47, 97, 114, 119, 101, 97, 118, 101,
          46, 110, 101, 116, 47, 69, 102, 50, 109, 51, 101, 109, 79, 48, 71, 45,
          121, 90, 89, 103, 101, 108, 78, 87, 74, 101, 95, 73, 54, 120, 81, 109,
          51, 115, 49, 55, 45, 55, 48, 70, 117, 49, 120, 117, 53, 85, 100, 99,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 100,
          0, 1, 4, 0, 0, 0, 81, 82, 116, 68, 209, 61, 121, 128, 70, 211, 38,
          152, 61, 100, 139, 77, 60, 192, 43, 161, 150, 110, 128, 58, 16, 175,
          219, 204, 103, 3, 93, 241, 1, 0, 147, 180, 78, 231, 209, 46, 101, 140,
          170, 106, 194, 3, 175, 127, 110, 205, 196, 102, 63, 226, 244, 231, 21,
          105, 117, 189, 77, 41, 72, 169, 55, 223, 0, 90, 251, 97, 182, 55, 122,
          127, 179, 50, 199, 57, 253, 172, 197, 252, 63, 95, 148, 109, 178, 13,
          153, 60, 45, 31, 185, 200, 224, 177, 206, 191, 57, 103, 0, 2, 245,
          255, 231, 124, 148, 129, 91, 82, 97, 206, 220, 203, 141, 49, 134, 114,
          166, 145, 132, 10, 90, 130, 141, 124, 36, 137, 147, 111, 126, 76, 27,
          28, 0, 8, 1, 1, 1, 255, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        ]),
      ),
      executable: false,
      lamports: 5616720,
      owner: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    },
    pubkey: 'FtCkYkLhZPGuNo74ppS4DJMMmF51g3bTmjNTmFBv5qCn',
  };

  const MASTER_EDITIONS = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          6, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0,
        ]),
      ),
      executable: false,
      lamports: 2853600,
      owner: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    },
    pubkey: '39NwbGjM45RePGfZUtd9g7SoXWoYqE78XMhrsMLMynWW',
  };

  const EDITIONS = {
    account: {
      data: Buffer.from(
        new Uint8Array([
          1, 128, 76, 145, 104, 160, 249, 49, 32, 67, 199, 30, 251, 150, 212,
          71, 166, 7, 173, 123, 77, 205, 81, 118, 70, 173, 31, 15, 27, 106, 174,
          220, 251, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
          0, 0, 0, 0,
        ]),
      ),
      executable: false,
      lamports: 2568240,
      owner: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
    },
    pubkey: '3TErNLvnj3H37YbE8WgL36jaEqk68Bgd8EsDc6SzGddQ',
  };

  it('metadata', () => {
    expect(processors.metadata.is(METADATA.account)).toBeTruthy();
    expect(processors.metadata.is(MASTER_EDITIONS.account)).toBeFalsy();
    expect(processors.metadata.is(EDITIONS.account)).toBeFalsy();
    const obj = processors.metadata.process(METADATA);
    expect(obj).toBeInstanceOf(Metadata);
    expect(obj).toMatchObject({
      key: 4,
      updateAuthority: 'AwaQ2ms2pcgV82AWRdtwRxHv7XTSussEtRX5jBjySzSA',
      mint: '8RmyhyzqUGxBLpRsREiPn4VNAdV1zPcdjAhid2L4qToC',
      data: {
        name: 'KODAMA0',
        symbol: 'KODAMA',
        uri: 'https://arweave.net/Ef2m3emO0G-yZYgelNWJe_I6xQm3s17-70Fu1xu5Udc',
        sellerFeeBasisPoints: 100,
        creators: [
          {
            address: '6USwtimcZPssjzkBWJjprv9Jz3PjEypAsrKQUwxSn5e8',
            verified: 1,
            share: 0,
          },
          {
            address: 'AwaQ2ms2pcgV82AWRdtwRxHv7XTSussEtRX5jBjySzSA',
            verified: 0,
            share: 90,
          },
          {
            address: 'HvHkSRFL92F7nSxQNE7viPpdzdVmgBu4uKBSBDdg63sL',
            verified: 0,
            share: 2,
          },
          {
            address: 'HZHD7x9YMRqFcLVQBB4EVamdKxij2A7gxHrVtmnHGyw9',
            verified: 0,
            share: 8,
          },
        ],
      },
      primarySaleHappened: 1,
      isMutable: 1,
      _id: 'FtCkYkLhZPGuNo74ppS4DJMMmF51g3bTmjNTmFBv5qCn',
    });
  });

  it('masterEditions', () => {
    expect(processors.masterEditions.is(METADATA.account)).toBeFalsy();
    expect(processors.masterEditions.is(MASTER_EDITIONS.account)).toBeTruthy();
    expect(processors.masterEditions.is(EDITIONS.account)).toBeFalsy();
    const obj = processors.masterEditions.process(MASTER_EDITIONS);
    expect(obj).toBeInstanceOf(MasterEditionV2);
    expect(obj).toMatchObject({
      key: 6,
      _id: '39NwbGjM45RePGfZUtd9g7SoXWoYqE78XMhrsMLMynWW',
    });
  });

  it('editions', () => {
    expect(processors.editions.is(METADATA.account)).toBeFalsy();
    expect(processors.editions.is(MASTER_EDITIONS.account)).toBeFalsy();
    expect(processors.editions.is(EDITIONS.account)).toBeTruthy();
    const obj = processors.editions.process(EDITIONS);
    expect(obj).toBeInstanceOf(Edition);
    expect(obj).toMatchObject({
      key: 1,
      parent: '9dpuLpWE3Kt8YpbMzQwzpGx8vyNeNP7kL9szeKjP5FWr',
      _id: '3TErNLvnj3H37YbE8WgL36jaEqk68Bgd8EsDc6SzGddQ',
    });
  });

  describe('processMetaData', () => {
    it('metadata', async () => {
      let result: any;
      await processMetaData(METADATA, async (prop, key, value) => {
        result = { prop, key, value };
      });
      expect(result.prop).toBe('metadata');
      expect(result.key).toBe('FtCkYkLhZPGuNo74ppS4DJMMmF51g3bTmjNTmFBv5qCn');
      expect(result.value).toBeInstanceOf(Metadata);
      expect(result.value).toMatchObject({
        key: 4,
        updateAuthority: 'AwaQ2ms2pcgV82AWRdtwRxHv7XTSussEtRX5jBjySzSA',
        mint: '8RmyhyzqUGxBLpRsREiPn4VNAdV1zPcdjAhid2L4qToC',
        data: {
          name: 'KODAMA0',
          symbol: 'KODAMA',
          uri: 'https://arweave.net/Ef2m3emO0G-yZYgelNWJe_I6xQm3s17-70Fu1xu5Udc',
          sellerFeeBasisPoints: 100,
          creators: [
            {
              address: '6USwtimcZPssjzkBWJjprv9Jz3PjEypAsrKQUwxSn5e8',
              verified: 1,
              share: 0,
            },
            {
              address: 'AwaQ2ms2pcgV82AWRdtwRxHv7XTSussEtRX5jBjySzSA',
              verified: 0,
              share: 90,
            },
            {
              address: 'HvHkSRFL92F7nSxQNE7viPpdzdVmgBu4uKBSBDdg63sL',
              verified: 0,
              share: 2,
            },
            {
              address: 'HZHD7x9YMRqFcLVQBB4EVamdKxij2A7gxHrVtmnHGyw9',
              verified: 0,
              share: 8,
            },
          ],
        },
        primarySaleHappened: 1,
        isMutable: 1,
        _id: 'FtCkYkLhZPGuNo74ppS4DJMMmF51g3bTmjNTmFBv5qCn',
      });
    });

    it('masterEditions', async () => {
      let result: any;
      await processMetaData(MASTER_EDITIONS, async (prop, key, value) => {
        result = { prop, key, value };
      });
      expect(result.prop).toBe('masterEditions');
      expect(result.key).toBe('39NwbGjM45RePGfZUtd9g7SoXWoYqE78XMhrsMLMynWW');
      expect(result.value).toBeInstanceOf(MasterEditionV2);
      expect(result.value).toMatchObject({
        key: 6,
        _id: '39NwbGjM45RePGfZUtd9g7SoXWoYqE78XMhrsMLMynWW',
      });
    });

    it('editions', async () => {
      let result: any;
      await processMetaData(EDITIONS, async (prop, key, value) => {
        result = { prop, key, value };
      });
      expect(result.prop).toBe('editions');
      expect(result.key).toBe('3TErNLvnj3H37YbE8WgL36jaEqk68Bgd8EsDc6SzGddQ');
      expect(result.value).toBeInstanceOf(Edition);
      expect(result.value).toMatchObject({
        key: 1,
        parent: '9dpuLpWE3Kt8YpbMzQwzpGx8vyNeNP7kL9szeKjP5FWr',
        _id: '3TErNLvnj3H37YbE8WgL36jaEqk68Bgd8EsDc6SzGddQ',
      });
    });
  });
});
