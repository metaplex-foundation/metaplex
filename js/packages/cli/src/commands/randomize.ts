import { EXTENSION_JSON, EXTENSION_PNG } from '../helpers/constants';
import path from 'path';
import fs from 'fs';

// use Fisher-Yates shuffle algorithm
export async function randomize(files: string[]): Promise<boolean> {
  const randomizeSuccessful = true;

  const images = files.filter(val => path.extname(val) === EXTENSION_PNG);
  const metadata = files.filter(val => path.extname(val) === EXTENSION_JSON);

  let currentIndex = images.length,
    randomIndex;

  // temp filenames
  const tmpPng = path.dirname(images[0]) + '/tmp' + EXTENSION_PNG;
  const tmpJson = path.dirname(metadata[0]) + '/tmp' + EXTENSION_JSON;

  // while there remains elements to shuffle
  while (currentIndex != 0) {
    // get random element
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // make sure random and current aren't the same. Making it possible for
    // them to be same so that we follow the Fisher-Yates algorithm
    if (randomIndex != currentIndex) {
      //
      // Swap with current
      //
      // rename current index png and json filenames to tmp so we can
      // swap the random filename with it
      fs.renameSync(images[currentIndex], tmpPng);
      fs.renameSync(metadata[currentIndex], tmpJson);

      // rename random index to current index
      fs.renameSync(images[randomIndex], images[currentIndex]);
      fs.renameSync(metadata[randomIndex], metadata[currentIndex]);

      // rename tmp to random index
      fs.renameSync(tmpPng, images[randomIndex]);
      fs.renameSync(tmpJson, metadata[randomIndex]);
    }
  }

  console.log('#####HEEEEYYYY######');

  return randomizeSuccessful;
}
