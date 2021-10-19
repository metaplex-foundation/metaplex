import path from 'path';
import log from 'loglevel';
import { validate } from 'jsonschema';

import { EXTENSION_JSON } from '../../helpers/constants';
import tokenMetadataJsonSchema from './token-metadata.schema.json';

type TokenMetadata = {
  image: string;
  properties: {
    files: { uri: string; type: string }[];
    creators: { address: string; share: number }[];
  };
};

export const verifyAssets = ({ files, uploadElementsCount, imageType }) => {
  const imageFileCount = files.filter(it => {
    return it.endsWith(`.${imageType}`);
  }).length;
  const jsonFileCount = files.filter(it => {
    return it.endsWith(EXTENSION_JSON);
  }).length;

  const parsedNumber = parseInt(uploadElementsCount, 10);
  const elemCount = parsedNumber ?? imageFileCount;

  if (imageFileCount !== jsonFileCount) {
    throw new Error(
      `number of ${imageType} files (${imageFileCount}) is different than the number of json files (${jsonFileCount})`,
    );
  }

  if (elemCount < imageFileCount) {
    throw new Error(
      `max number (${elemCount}) cannot be smaller than the number of elements in the source folder (${imageFileCount})`,
    );
  }

  log.info(`Verifying token metadata for ${imageFileCount} (${imageType}+json) pairs`);
};

export const verifyAggregateShare = (
  creators: TokenMetadata['properties']['creators'],
  manifestFile,
) => {
  const aggregateShare = creators
    .map(creator => creator.share)
    .reduce((memo, share) => {
      return memo + share;
    }, 0);
  // Check that creator share adds up to 100
  if (aggregateShare !== 100) {
    throw new Error(
      `Creator share for ${manifestFile} does not add up to 100, got: ${aggregateShare}.`,
    );
  }
};

type CollatedCreators = Map<
  string,
  { shares: Set<number>; tokenCount: number }
>;
export const verifyCreatorCollation = (
  creators: TokenMetadata['properties']['creators'],
  collatedCreators: CollatedCreators,
  manifestFile: string,
) => {
  for (const { address, share } of creators) {
    if (collatedCreators.has(address)) {
      const creator = collatedCreators.get(address);
      creator.shares.add(share);
      if (creator.shares.size > 1) {
        log.warn(
          `The creator share for ${address} in ${manifestFile} is different than the share declared for a previous token.  This means at least one token is inconsistently configured, but we will continue.  `,
        );
      }
      creator.tokenCount += 1;
    } else {
      collatedCreators.set(address, {
        tokenCount: 1,
        shares: new Set([share]),
      });
    }
  }
};

export const verifyImageURL = (image, imageType, files, manifestFile) => {
  const expectedImagePath = `image.${imageType}`;
  if (image !== expectedImagePath) {
    // We _could_ match against this in the JSON schema validation, but it is totally valid to have arbitrary URLs to images here.
    // The downside, though, is that those images will not get uploaded to Arweave since they're not on-disk.
    log.warn(`We expected the \`image\` property in ${manifestFile} to be ${expectedImagePath}.
This will still work properly (assuming the URL is valid!), however, this image will not get uploaded to Arweave through the \`metaplex upload\` command.   
If you want us to take care of getting this into Arweave, make sure to set \`image\`: "${expectedImagePath}"
The \`metaplex upload\` command will automatically substitute this URL with the Arweave URL location.
    `);
  }
  const imageFiles = files.filter(file => file.type === `image/${imageType}`);
  if (imageFiles.length === 0 || !imageFiles.some(file => file.uri === image)) {
    throw new Error(
      `At least one entry with the \`image/${imageType}\` type in the \`properties.files\` array is expected to match the \`image\` property.`,
    );
  }
};

export const verifyConsistentShares = (collatedCreators: CollatedCreators) => {
  // We expect all creators to have been added to the same amount of tokens
  const tokenCountSet = new Set<number>();
  for (const [address, collation] of collatedCreators.entries()) {
    tokenCountSet.add(collation.tokenCount);
    if (tokenCountSet.size > 1) {
      log.warn(
        `We found that ${address} was added to more tokens than other creators.`,
      );
    }
  }
};

export const verifyMetadataManifests = ({ files, imageType }) => {
  const manifestFiles = files.filter(
    file => path.extname(file) === EXTENSION_JSON,
  );

  // Used to keep track of the share allocations for individual creators
  // We will send a warning if we notice discrepancies across the entire collection.
  const collatedCreators: CollatedCreators = new Map();

  // Do manifest-specific stuff here
  for (const manifestFile of manifestFiles) {
    // Check the overall schema shape. This is a non-exhaustive check, but guarantees the bare minimum needed for the rest of the commands to succeed.
    const tokenMetadata = require(manifestFile) as TokenMetadata;
    validate(tokenMetadata, tokenMetadataJsonSchema, { throwError: true });

    const {
      properties: { creators },
    } = tokenMetadata;
    verifyAggregateShare(creators, manifestFile);

    verifyCreatorCollation(creators, collatedCreators, manifestFile);

    // Check that the `image` and at least one of the files has a URI matching the index of this token.
    const {
      image,
      properties: { files },
    } = tokenMetadata;
    verifyImageURL(image, imageType, files, manifestFile);
  }

  verifyConsistentShares(collatedCreators);
};

export const verifyTokenMetadata = ({
  files,
  uploadElementsCount = null,
  imageType,
}): Boolean => {
  // Will we need to deal with the cache?

  verifyAssets({ files, uploadElementsCount, imageType });

  verifyMetadataManifests({ files, imageType });

  return true;
};
