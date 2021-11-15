import { EXTENSION_PNG } from '../helpers/constants';
import path from 'path';
import fs from 'fs';

export async function randomize(
  files: string[],
  totalNFTs: number,
  ): Promise<boolean> {
  let randomizeSuccessful = true;

  const images = files.filter(val => path.extname(val) === EXTENSION_PNG);
  const SIZE = images.length;
  /*files.forEach(f => {
    if (!seen[f.replace(EXTENSION_PNG, '').split('/').pop()]) {
      seen[f.replace(EXTENSION_PNG, '').split('/').pop()] = true;
      newFiles.push(f);
    }
  });*/

  console.log('#####HEEEEYYYY######');

  return randomizeSuccessful;
  }