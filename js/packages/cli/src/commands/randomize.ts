import { EXTENSION_JSON, EXTENSION_PNG } from '../helpers/constants';
import path from 'path';
import fs from 'fs';
import { random } from 'lodash';

// use Fisher-Yates shuffle algorithm
export async function randomize(
  files: string[],
  totalNFTs: number,
  ): Promise<boolean> {
  let randomizeSuccessful = true;

  const images = files.filter(val => path.extname(val) === EXTENSION_PNG);
  const metadata = files.filter(val => path.extname(val) === EXTENSION_JSON);

  const SIZE = images.length;
  
  let currentIndex = images.length, randomIndex;

  // temp filenames
  const tmpPng = path.dirname(images[0]) + '/tmp' + EXTENSION_PNG;
  const tmpJson = path.dirname(metadata[0]) + '/tmp' + EXTENSION_JSON;

  // while there remains elements to shuffle
  while(currentIndex != 0) {

    // get random element
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // make sure random and current aren't the same. Making it possible for
    // them to be same so that we follow the Fisher-Yates algorithm
    if(randomIndex!=currentIndex){

      const currentPng = images[currentIndex];
      const currentJson = metadata[currentIndex];
      const randomPng = images[randomIndex];
      const randomJson = metadata[randomIndex];

      //
      // Swap with current
      //
      // rename current index png and json filenames to tmp so we can 
      // swap the random filename with it
      fs.renameSync(currentPng, tmpPng);
      fs.renameSync(currentJson, tmpJson);

      // rename random index to current index
      fs.renameSync(randomPng, currentPng);
      fs.renameSync(randomJson, currentJson);
      
      // rename tmp to random index
      fs.renameSync(tmpPng, randomPng);
      fs.renameSync(tmpJson, randomJson);
    }
  }

  console.log('#####HEEEEYYYY######');

  return randomizeSuccessful;
  }