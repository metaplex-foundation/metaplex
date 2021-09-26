import fs from 'fs';
import log from 'loglevel';
import _ from 'lodash';
import { generateRandomSet, getMetadata } from './various';

const { readFile, writeFile, mkdir } = fs.promises;

const ASSETS_DIRECTORY = './assets';

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

  let traitsConfiguration;
  try {
    const file = await readFile(configLocation, 'utf-8');
    traitsConfiguration = JSON.parse(file);
  } catch (err) {
    log.error('The file could not be read', err);
    throw err;
  }

  const {
    breakdown,
    name,
    symbol,
    creators,
    description,
    seller_fee_basis_points,
    collection,
  } = traitsConfiguration;

  while (numberOfFilesCreated < parseInt(numberOfImages, 10)) {
    const randomizedSet = generateRandomSet(breakdown);

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

      log.info(metadata);
      numberOfFilesCreated += 1;
    }
  }

  // map through after because IDs would make sets unique
  const randomSetWithIds = randomizedSets.map((item, index) => ({
    id: index + 1,
    ...item,
  }));

  return randomSetWithIds;
}
