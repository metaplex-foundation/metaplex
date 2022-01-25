"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTokenMetadata = exports.verifyMetadataManifests = exports.verifyConsistentShares = exports.verifyImageURL = exports.verifyCreatorCollation = exports.verifyAggregateShare = exports.verifyAssets = void 0;
const path_1 = __importDefault(require("path"));
const loglevel_1 = __importDefault(require("loglevel"));
const jsonschema_1 = require("jsonschema");
const constants_1 = require("../../helpers/constants");
const token_metadata_schema_json_1 = __importDefault(require("./token-metadata.schema.json"));
const verifyAssets = ({ files, uploadElementsCount }) => {
    const imgFileCount = files.filter(it => {
        return !it.endsWith(constants_1.EXTENSION_JSON);
    }).length;
    const jsonFileCount = files.filter(it => {
        return it.endsWith(constants_1.EXTENSION_JSON);
    }).length;
    const parsedNumber = parseInt(uploadElementsCount, 10);
    const elemCount = parsedNumber !== null && parsedNumber !== void 0 ? parsedNumber : imgFileCount;
    if (imgFileCount !== jsonFileCount) {
        throw new Error(`number of img files (${imgFileCount}) is different than the number of json files (${jsonFileCount})`);
    }
    if (elemCount < imgFileCount) {
        throw new Error(`max number (${elemCount}) cannot be smaller than the number of elements in the source folder (${imgFileCount})`);
    }
    loglevel_1.default.info(`Verifying token metadata for ${imgFileCount} (img+json) pairs`);
};
exports.verifyAssets = verifyAssets;
const verifyAggregateShare = (creators, manifestFile) => {
    const aggregateShare = creators
        .map(creator => creator.share)
        .reduce((memo, share) => {
        if (!Number.isInteger(share)) {
            throw new Error(`Creator share for ${manifestFile} contains floats. Only use integers for this number.`);
        }
        return memo + share;
    }, 0);
    // Check that creator share adds up to 100
    if (aggregateShare !== 100) {
        throw new Error(`Creator share for ${manifestFile} does not add up to 100, got: ${aggregateShare}.`);
    }
};
exports.verifyAggregateShare = verifyAggregateShare;
const verifyCreatorCollation = (creators, collatedCreators, manifestFile) => {
    for (const { address, share } of creators) {
        if (collatedCreators.has(address)) {
            const creator = collatedCreators.get(address);
            creator.shares.add(share);
            if (creator.shares.size > 1) {
                loglevel_1.default.warn(`The creator share for ${address} in ${manifestFile} is different than the share declared for a previous token.  This means at least one token is inconsistently configured, but we will continue.  `);
            }
            creator.tokenCount += 1;
        }
        else {
            collatedCreators.set(address, {
                tokenCount: 1,
                shares: new Set([share]),
            });
        }
    }
};
exports.verifyCreatorCollation = verifyCreatorCollation;
const verifyImageURL = (image, files, manifestFile) => {
    // The image is expected to have the same name as the index
    const fileIndex = manifestFile.split('/').pop().split('.')[0];
    const ext = path_1.default.extname(image);
    const expectedImagePath = `${fileIndex}${ext}`;
    if (image !== expectedImagePath) {
        // We _could_ match against this in the JSON schema validation, but it is totally valid to have arbitrary URLs to images here.
        // The downside, though, is that those images will not get uploaded to Arweave since they're not on-disk.
        loglevel_1.default.warn(`We expected the \`image\` property in ${manifestFile} to be ${expectedImagePath}.
This will still work properly (assuming the URL is valid!), however, this image will not get uploaded to Arweave through the \`metaplex upload\` command.
If you want us to take care of getting this into Arweave, make sure to set \`image\`: "${expectedImagePath}"
The \`metaplex upload\` command will automatically substitute this URL with the Arweave URL location.
    `);
    }
    const mediaFiles = files.filter(file => file.type !== constants_1.EXTENSION_JSON);
    if (mediaFiles.length === 0 || !mediaFiles.some(file => file.uri === image)) {
        throw new Error(`At least one media file entry in \`properties.files\` array is expected to match the \`image\` property.`);
    }
};
exports.verifyImageURL = verifyImageURL;
const verifyConsistentShares = (collatedCreators) => {
    // We expect all creators to have been added to the same amount of tokens
    const tokenCountSet = new Set();
    for (const [address, collation] of collatedCreators.entries()) {
        tokenCountSet.add(collation.tokenCount);
        if (tokenCountSet.size > 1) {
            loglevel_1.default.warn(`We found that ${address} was added to more tokens than other creators.`);
        }
    }
};
exports.verifyConsistentShares = verifyConsistentShares;
const verifyMetadataManifests = ({ files }) => {
    const manifestFiles = files.filter(file => path_1.default.extname(file) === constants_1.EXTENSION_JSON);
    // Used to keep track of the share allocations for individual creators
    // We will send a warning if we notice discrepancies across the entire collection.
    const collatedCreators = new Map();
    // Do manifest-specific stuff here
    for (const manifestFile of manifestFiles) {
        loglevel_1.default.info(`Checking manifest file: ${manifestFile}`);
        // Check the overall schema shape. This is a non-exhaustive check, but guarantees the bare minimum needed for the rest of the commands to succeed.
        const tokenMetadata = require(manifestFile);
        (0, jsonschema_1.validate)(tokenMetadata, token_metadata_schema_json_1.default, { throwError: true });
        const { properties: { creators }, } = tokenMetadata;
        (0, exports.verifyAggregateShare)(creators, manifestFile);
        (0, exports.verifyCreatorCollation)(creators, collatedCreators, manifestFile);
        // Check that the `image` and at least one of the files has a URI matching the index of this token.
        const { image, properties: { files }, } = tokenMetadata;
        (0, exports.verifyImageURL)(image, files, manifestFile);
    }
    (0, exports.verifyConsistentShares)(collatedCreators);
};
exports.verifyMetadataManifests = verifyMetadataManifests;
const verifyTokenMetadata = ({ files, uploadElementsCount = null, }) => {
    // Will we need to deal with the cache?
    (0, exports.verifyAssets)({ files, uploadElementsCount });
    (0, exports.verifyMetadataManifests)({ files });
    return true;
};
exports.verifyTokenMetadata = verifyTokenMetadata;
