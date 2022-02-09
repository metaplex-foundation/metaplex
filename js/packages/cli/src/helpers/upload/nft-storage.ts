import log from 'loglevel';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

export async function nftStorageUpload(
  nftStorageKey: string,
  image: string,
  animation: string,
  manifestBuffer: Buffer,
) {
  async function uploadMedia(media) {
    const stats = fs.statSync(media);
    const readStream = fs.createReadStream(media);
    log.info(`Media Upload ${media}`);
    return fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
        'Content-length': stats.size,
        Authorization: `Bearer ${nftStorageKey}`,
      },
      body: readStream, // Here, stringContent or bufferContent would also work
    })
      .then(response => response.json())
      .then(mediaUploadResponse => {
        const mediaURL = `https://${mediaUploadResponse.value.cid}.ipfs.dweb.link`;
        return mediaURL;
      })
      .catch(error => {
        log.debug(error);
        throw new Error(`Media Upload Error: ${error}`);
      });
  }

  // Copied from ipfsUpload
  const imageUrl = `${await uploadMedia(image)}?ext=${path
    .extname(image)
    .replace('.', '')}`;
  const animationUrl = animation
    ? `${await uploadMedia(animation)}?ext=${path
        .extname(animation)
        .replace('.', '')}`
    : undefined;
  const manifestJson = JSON.parse(manifestBuffer.toString('utf8'));
  manifestJson.image = imageUrl;
  if (animation) {
    manifestJson.animation_url = animationUrl;
  }

  log.info('Upload metadata');
  const metaData = Buffer.from(JSON.stringify(manifestJson));
  return fetch('https://api.nft.storage/upload', {
    method: 'POST',
    headers: {
      'Content-length': metaData.byteLength,
      Authorization: `Bearer ${nftStorageKey}`,
    },
    body: metaData, // Here, stringContent or bufferContent would also work
  })
    .then(response => response.json())
    .then(metaUploadResponse => {
      const link = `https://${metaUploadResponse.value.cid}.ipfs.dweb.link`;
      log.info('Upload End');
      if (animation) {
        log.debug([link, imageUrl, animationUrl]);
      } else {
        log.debug([link, imageUrl]);
      }
      return [link, imageUrl, animationUrl];
    })
    .catch(error => {
      log.debug(error);
      throw new Error(`Metadata Upload Error: ${error}`);
    });
}
