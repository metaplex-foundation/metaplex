import path from 'path';
import log from 'loglevel';
import { validate } from 'jsonschema';
import { EXTENSION_JSON } from '../../helpers/constants';
import { EXTENSION_PNG, EXTENSION_JPG, EXTENSION_GIF } from '../../helpers/constants';
import { EXTENSION_MP4, EXTENSION_MOV, EXTENSION_MP3, EXTENSION_FLAC, EXTENSION_WAV, EXTENSION_GLB, EXTENSION_HTML } from '../../helpers/constants';
import tokenMetadataJsonSchema from './token-metadata.schema.json';

type TokenMetadata = {
  image: string;
  animation_url: string;
  properties: {
    files: { uri: string; type: string }[];
    creators: { address: string; share: number }[];
  };
};

export const verifyAssets = ({ files, uploadElementsCount }) => {
  const imgFileCount = files.filter(it => {
    return it.endsWith(EXTENSION_PNG) || 
           it.endsWith(EXTENSION_JPG) || 
           it.endsWith(EXTENSION_GIF);
  }).length;
  const animationFileCount = files.filter(it => {
    return it.endsWith(EXTENSION_MP4) || 
           it.endsWith(EXTENSION_MOV) || 
           it.endsWith(EXTENSION_MP3) || 
           it.endsWith(EXTENSION_FLAC)|| 
           it.endsWith(EXTENSION_WAV) || 
           it.endsWith(EXTENSION_GLB) || 
           it.endsWith(EXTENSION_HTML);
  }).length;
  const jsonFileCount = files.filter(it => {
    return it.endsWith(EXTENSION_JSON);
  }).length;

  const parsedNumber = parseInt(uploadElementsCount, 10);
  const elemCount = parsedNumber ?? imgFileCount;

  if (imgFileCount !== jsonFileCount) {
    throw new Error(
      `number of img files (${imgFileCount}) is different than the number of json files (${jsonFileCount})`,
    );
  }
  if (animationFileCount) {
    if (animationFileCount !== jsonFileCount) {
      throw new Error(
        `number of animation files (${animationFileCount}) is different than the number of json files (${jsonFileCount})`,
      );
    }
    if (animationFileCount !== imgFileCount) {
      throw new Error(
        `number of animation files (${animationFileCount}) is different than the number of img files (${imgFileCount})`,
      );
    }
  }

  if (elemCount < imgFileCount) {
    throw new Error(
      `max number (${elemCount}) cannot be smaller than the number of elements in the source folder (${imgFileCount})`,
    );
  }

  if (animationFileCount) {
    log.info(`Verifying token metadata for ${jsonFileCount} (img+animation+json) sets`);
  }
  else {
    log.info(`Verifying token metadata for ${jsonFileCount} (img+json) pairs`);
  }
  
};

export const verifyAggregateShare = (
  creators: TokenMetadata['properties']['creators'],
  manifestFile,
) => {
  const aggregateShare = creators
    .map(creator => creator.share)
    .reduce((memo, share) => {
      if (!Number.isInteger(share)) {
        throw new Error(
          `Creator share for ${manifestFile} contains floats. Only use integers for this number.`,
        );
      }
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

export const verifyImageURL = (image, files, manifestFile) => {
  // The image is expected to have the same name as the index
  const fileIndex = manifestFile.split('/').pop().split('.')[0];
  const ext = path.extname(image);
  const expectedImagePath = `${fileIndex}${ext}`;
  if (image !== expectedImagePath) {
    // We _could_ match against this in the JSON schema validation, but it is totally valid to have arbitrary URLs to images here.
    // The downside, though, is that those images will not get uploaded to Arweave since they're not on-disk.
    log.warn(`We expected the \`image\` property in ${manifestFile} to be ${expectedImagePath}.
This will still work properly (assuming the URL is valid!), however, this image will not get uploaded to Arweave through the \`metaplex upload\` command.
If you want us to take care of getting this into Arweave, make sure to set \`image\`: "${expectedImagePath}"
The \`metaplex upload\` command will automatically substitute this URL with the Arweave URL location.
    `);
  }
  const mediaFiles = files.filter(file => file.type !== EXTENSION_JSON);
  if (mediaFiles.length === 0 || !mediaFiles.some(file => file.uri === image)) {
    throw new Error(
      `At least one media file entry in \`properties.files\` array is expected to match the \`image\` property.`,
    );
  }
};

export const verifyAnimationURL = (animation_url, files, manifestFile) => {
  // The animation_url is expected to have the same name as the index
  const fileIndex = manifestFile.split('/').pop().split('.')[0];
  const ext = path.extname(animation_url);
  const expectedAnimationPath = `${fileIndex}${ext}`;
  if (animation_url !== expectedAnimationPath) {
    // We _could_ match against this in the JSON schema validation, but it is totally valid to have arbitrary URLs to images here.
    // The downside, though, is that those images will not get uploaded to Arweave since they're not on-disk.
    log.warn(`We expected the \`animation_url\` property in ${manifestFile} to be ${expectedAnimationPath}.
This will still work properly (assuming the URL is valid!), however, this animation_url will not get uploaded to Arweave through the \`metaplex upload\` command.
If you want us to take care of getting this into Arweave, make sure to set \`animation_url\`: "${expectedAnimationPath}"
The \`metaplex upload\` command will automatically substitute this URL with the Arweave URL location.
    `);
  }
  const mediaFiles = files.filter(file => file.type !== EXTENSION_JSON);
  if (mediaFiles.length === 0 || !mediaFiles.some(file => file.uri === animation_url)) {
    throw new Error(
      `At least one media file entry in \`properties.files\` array is expected to match the \`animation_url\` property.`,
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

export const verifyMetadataManifests = ({ files }) => {
  const manifestFiles = files.filter(
    file => path.extname(file) === EXTENSION_JSON,
  );

  // Used to keep track of the share allocations for individual creators
  // We will send a warning if we notice discrepancies across the entire collection.
  const collatedCreators: CollatedCreators = new Map();

  // Do manifest-specific stuff here
  for (const manifestFile of manifestFiles) {
    log.info(`Checking manifest file: ${manifestFile}`);
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
    verifyImageURL(image, files, manifestFile);

    if (Object.prototype.hasOwnProperty.call(tokenMetadata, 'animation_url')) {
      // Check that the `animation_url` and at least one of the files has a URI matching the index of this token.
      const {
        animation_url,
        properties: { files },
      } = tokenMetadata;
      verifyAnimationURL(animation_url, files, manifestFile);
    }
  }

  verifyConsistentShares(collatedCreators);
};

export const verifyTokenMetadata = ({
  files,
  uploadElementsCount = null,
}): Boolean => {
  // Will we need to deal with the cache?

  verifyAssets({ files, uploadElementsCount });

  verifyMetadataManifests({ files });

  return true;
};
