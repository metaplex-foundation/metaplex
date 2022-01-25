"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const loglevel_1 = __importDefault(require("loglevel"));
const index_1 = require("../index");
const constants_1 = require("../../../helpers/constants");
const globals_1 = require("@jest/globals");
const getFiles = rootDir => {
    const assets = fs_1.default.readdirSync(rootDir).map(file => path_1.default.join(rootDir, file));
    return assets;
};
describe('`metaplex verify_token_metadata`', () => {
    const spy = globals_1.jest.spyOn(loglevel_1.default, 'warn');
    beforeEach(() => {
        spy.mockClear();
    });
    it('catches mismatched assets', () => {
        const mismatchedAssets = getFiles(path_1.default.join(__dirname, '../__fixtures__/mismatchedAssets'));
        expect(() => (0, index_1.verifyTokenMetadata)({ files: mismatchedAssets })).toThrowErrorMatchingInlineSnapshot(`"number of img files (0) is different than the number of json files (1)"`);
    });
    const invalidSchemas = getFiles(path_1.default.join(__dirname, '../__fixtures__/invalidSchema'));
    invalidSchemas.forEach(invalidSchema => {
        it(`invalidates ${path_1.default.relative(__dirname, invalidSchema)}`, () => {
            expect(() => (0, index_1.verifyTokenMetadata)({
                files: [invalidSchema, invalidSchema.replace('.json', constants_1.EXTENSION_PNG)],
            })).toThrowErrorMatchingSnapshot();
        });
    });
    it('throws on invalid share allocation', () => {
        expect(() => (0, index_1.verifyAggregateShare)([{ address: 'some-solana-address', share: 80 }], 'placeholder-manifest-file')).toThrowErrorMatchingInlineSnapshot(`"Creator share for placeholder-manifest-file does not add up to 100, got: 80."`);
        expect(() => (0, index_1.verifyAggregateShare)([
            { address: 'some-solana-address', share: 80 },
            {
                address: 'some-other-solana-address',
                share: 19,
            },
        ], 'placeholder-manifest-file')).toThrowErrorMatchingInlineSnapshot(`"Creator share for placeholder-manifest-file does not add up to 100, got: 99."`);
    });
    it('throws on invalid share number type', () => {
        expect(() => (0, index_1.verifyAggregateShare)([
            { address: 'some-solana-address', share: 80 },
            {
                address: 'some-other-solana-address',
                share: 19.9,
            },
        ], 'placeholder-manifest-file')).toThrowErrorMatchingInlineSnapshot(`"Creator share for placeholder-manifest-file contains floats. Only use integers for this number."`);
    });
    it('warns when using different image URIs', () => {
        (0, index_1.verifyImageURL)('https://google.com?ext=png', [{ uri: 'https://google.com?ext=png', type: 'image/png' }], '0.json');
        expect(spy).toHaveBeenCalledTimes(1);
    });
    it('warns when there are inconsistent share allocations', () => {
        const collatedCreators = new Map([
            ['some-solana-address', { shares: new Set([70]), tokenCount: 10 }],
        ]);
        (0, index_1.verifyCreatorCollation)([{ address: 'some-solana-address', share: 80 }], collatedCreators, '0.json');
        expect(spy).toHaveBeenCalledTimes(1);
    });
    it('warns when there are inconsistent creator allocations', () => {
        const collatedCreators = new Map([
            ['some-solana-address', { shares: new Set([80]), tokenCount: 10 }],
            ['some-other-solana-address', { shares: new Set([80]), tokenCount: 20 }],
        ]);
        (0, index_1.verifyConsistentShares)(collatedCreators);
        expect(spy).toHaveBeenCalledTimes(1);
    });
});
