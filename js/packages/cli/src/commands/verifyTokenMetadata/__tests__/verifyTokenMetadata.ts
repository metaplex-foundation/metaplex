import fs from 'fs';
import path from 'path';
import log from 'loglevel';
import {
  verifyTokenMetadata,
  verifyAggregateShare,
  verifyImageURL,
  verifyConsistentShares,
  verifyCreatorCollation,
} from '../index';

const getFiles = rootDir => {
  const assets = fs.readdirSync(rootDir).map(file => path.join(rootDir, file));
  return assets;
};

describe('`metaplex verify_token_metadata`', () => {
  const spy = jest.spyOn(log, 'warn');
  beforeEach(() => {
    spy.mockClear();
  });

  it('catches mismatched assets', () => {
    const mismatchedAssets = getFiles(
      path.join(__dirname, '../__fixtures__/mismatchedAssets'),
    );
    expect(() =>
      verifyTokenMetadata({ files: mismatchedAssets }),
    ).toThrowErrorMatchingInlineSnapshot(
      `"number of png files (0) is different than the number of json files (1)"`,
    );
  });

  const invalidSchemas = getFiles(
    path.join(__dirname, '../__fixtures__/invalidSchema'),
  );
  invalidSchemas.forEach(invalidSchema => {
    it(`invalidates ${path.relative(__dirname, invalidSchema)}`, () => {
      expect(() =>
        verifyTokenMetadata({
          files: [invalidSchema, invalidSchema.replace('.json', '.png')],
        }),
      ).toThrowErrorMatchingSnapshot();
    });
  });

  it('throws on invalid share allocation', () => {
    expect(() =>
      verifyAggregateShare(
        [{ address: 'some-solana-address', share: 80 }],
        'placeholder-manifest-file',
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Creator share for placeholder-manifest-file does not add up to 100, got: 80."`,
    );

    expect(() =>
      verifyAggregateShare(
        [
          { address: 'some-solana-address', share: 80 },
          {
            address: 'some-other-solana-address',
            share: 19.9,
          },
        ],

        'placeholder-manifest-file',
      ),
    ).toThrowErrorMatchingInlineSnapshot(
      `"Creator share for placeholder-manifest-file does not add up to 100, got: 99.9."`,
    );
  });

  it('warns when using different image URIs', () => {
    verifyImageURL(
      'https://google.com?ext=png',
      [{ uri: 'https://google.com?ext=png', type: 'image/png' }],
      '0.json',
    );
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('warns when there are inconsistent share allocations', () => {
    const collatedCreators = new Map([
      ['some-solana-address', { shares: new Set([70]), tokenCount: 10 }],
    ]);
    verifyCreatorCollation(
      [{ address: 'some-solana-address', share: 80 }],
      collatedCreators,
      '0.json',
    );
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('warns when there are inconsistent creator allocations', () => {
    const collatedCreators = new Map([
      ['some-solana-address', { shares: new Set([80]), tokenCount: 10 }],
      ['some-other-solana-address', { shares: new Set([80]), tokenCount: 20 }],
    ]);
    verifyConsistentShares(collatedCreators);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
