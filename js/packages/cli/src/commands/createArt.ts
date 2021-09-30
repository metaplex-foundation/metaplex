import fs from 'fs';
import canvas from 'canvas';
import imagemin from 'imagemin';
import imageminPngquant from 'imagemin-pngquant';
import log from 'loglevel';

import { readJsonFile, sleep } from '../helpers/various';
import { ASSETS_DIRECTORY, TRAITS_DIRECTORY } from '../helpers/metadata';

const { createCanvas, loadImage } = canvas;

const createImage = async (order = [], image, width, height) => {
  const canvas = createCanvas(width, height);
  const context = canvas.getContext('2d');
  const ID = parseInt(image.id, 10) - 1;
  await Promise.all(
    order.map(async cur => {
      const imageLocation = `${TRAITS_DIRECTORY}/${cur}/${image[cur]}`;
      const loadedImage = await loadImage(imageLocation);
      context.patternQuality = 'best';
      context.quality = 'best';
      context.drawImage(loadedImage, 0, 0, width, height);
    }),
  );
  const buffer = canvas.toBuffer('image/png');
  const optimizedImage = await imagemin.buffer(buffer, {
    plugins: [
      imageminPngquant({
        quality: [0.6, 0.95],
      }),
    ],
  });
  log.info(`Placed ${ID}.png into the ${ASSETS_DIRECTORY}`);
  fs.writeFileSync(`${ASSETS_DIRECTORY}/${ID}.png`, optimizedImage);
};

export async function createGenerativeArt(
  configLocation: string,
  randomizedSets,
) {
  const { order, width, height } = await readJsonFile(configLocation);
  const PROCESSING_LENGTH: number = 10;

  const processImage = async (marker = 0) => {
    const slice = randomizedSets.slice(marker, marker + PROCESSING_LENGTH + 1);
    // generate images for the portion
    await Promise.all(
      slice.map(async image => {
        await createImage(order, image, width, height);
      }),
    );
    marker += PROCESSING_LENGTH;
    await sleep(1000);
    if (marker < randomizedSets.length - 1) {
      processImage(marker);
    }
  };

  // recurse until completion
  processImage();
}
