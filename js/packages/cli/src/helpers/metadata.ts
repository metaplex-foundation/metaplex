import fs from 'fs';
import log from 'loglevel';
import _ from 'lodash';
import {
  generateRandomSet,
  getMetadata,
  readJsonFile,
  shuffle,
} from './various';

const { writeFile, mkdir } = fs.promises;

export const ASSETS_DIRECTORY = './assets';
export const TRAITS_DIRECTORY = './traits';

export async function createMetadataFiles(
  numberOfImages: string,
  configLocation: string,
): Promise<any[]> {
  let numberOfFilesCreated: number = 0;
  const randomizedSets = [];

  if (!fs.existsSync(ASSETS_DIRECTORY)) {
    try {
      await mkdir(ASSETS_DIRECTORY);
    } catch (err) {
      log.error('unable to create assets directory', err);
    }
  }

  const {
    breakdown,
    name,
    symbol,
    creators,
    description,
    seller_fee_basis_points,
    collection,
    dnp,
    premadeCustoms,
  } = await readJsonFile(configLocation);

  while (numberOfFilesCreated < premadeCustoms.length) {
    randomizedSets.push(premadeCustoms[numberOfFilesCreated]);
    numberOfFilesCreated += 1;
  }

  while (numberOfFilesCreated < parseInt(numberOfImages, 10)) {
    const randomizedSet = generateRandomSet(breakdown, dnp);

    if (!_.some(randomizedSets, randomizedSet)) {
      randomizedSets.push(randomizedSet);

      const metadata = getMetadata(
        name,
        symbol,
        numberOfFilesCreated,
        creators,
        description,
        seller_fee_basis_points,
        randomizedSet,
        collection,
      );

      try {
        await writeFile(
          `${ASSETS_DIRECTORY}/${numberOfFilesCreated}.json`,
          JSON.stringify(metadata),
        );
      } catch (err) {
        log.error(`${numberOfFilesCreated} failed to get created`, err);
      }

      numberOfFilesCreated += 1;
    }
  }

  const shuffled = shuffle(randomizedSets);

  for (let i = 0; i < shuffled.length; i++) {
    const metadata = getMetadata(
      name,
      symbol,
      numberOfFilesCreated,
      creators,
      description,
      seller_fee_basis_points,
      randomizedSets[i],
      collection,
    );

    try {
      await writeFile(
        `${ASSETS_DIRECTORY}/${i}.json`,
        JSON.stringify(metadata),
      );
    } catch (err) {
      log.error(`${numberOfFilesCreated} failed to get created`, err);
    }
  }

  // map through after because IDs would make sets unique
  const randomSetWithIds = shuffled.map((item, index) => ({
    id: index + 1,
    ...item,
  }));

  return randomSetWithIds;
}
