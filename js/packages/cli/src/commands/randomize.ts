import { EXTENSION_JSON, EXTENSION_PNG } from '../helpers/constants';
import path from 'path';
import fs from 'fs';

// This funciton uses the Fisher-Yates shuffle algorithm to shuffle
// the png/json pairs in a given array of filenames
export async function randomize(files: string[]): Promise<boolean> {
  const randomizeSuccessful = true;

  // get images and metadata filenames
  const images = files.filter(val => path.extname(val) === EXTENSION_PNG);
  const metadata = files.filter(val => path.extname(val) === EXTENSION_JSON);

  // create temp filenames for when we 'shuffle/swap' filenames
  const tmpPng = path.dirname(images[0]) + '/tmp' + EXTENSION_PNG;
  const tmpJson = path.dirname(metadata[0]) + '/tmp' + EXTENSION_JSON;

  // create indexes to use for shuffle algorithm
  let currentIndex = images.length,
    randomIndex;

  // while there remains elements to shuffle
  while (currentIndex != 0) {
    // get random element
    randomIndex = Math.floor(Math.random() * currentIndex);

    // cycle through indices
    currentIndex--;

    // Swap the random index and current index file names.
    // Only swap if random chosen index is different than current.
    // Otherwise it will cause issues when we rename with temp name.
    if (randomIndex != currentIndex) {
      // rename current index filenames to tmp so we can
      // change the random index filenames to the current index filenames
      // without duplicating the filename in the filesystem.
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

  return randomizeSuccessful;
}
