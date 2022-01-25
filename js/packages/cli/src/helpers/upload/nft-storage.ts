import log from 'loglevel';
import fetch from 'node-fetch';
import fs from 'fs';

export async function nftStorageUpload(
  nftStorageKey: string,
  image: string,
  manifestBuffer: Buffer,
) {
  const stats = fs.statSync(image);
  let fileSizeInBytes = stats.size;
  const readStream = fs.createReadStream(image);
  log.info(`Image Upload ${image}`)
  return fetch('https://api.nft.storage/upload', {
    method: 'POST',
    headers: {
        "Content-length": fileSizeInBytes,
        "Authorization": `Bearer ${nftStorageKey}`,
    },
    body: readStream // Here, stringContent or bufferContent would also work
  }).then((response) => response.json()).then(imageUploadResponse => {
    const mediaURL = `https://${imageUploadResponse.value.cid}.ipfs.dweb.link`
    log.info('Upload metadata');
    const manifestJson = JSON.parse(manifestBuffer.toString('utf8'));
    manifestJson.image = mediaURL;
    const metaData = Buffer.from(JSON.stringify(manifestJson));
    fileSizeInBytes = metaData.byteLength;
    return fetch('https://api.nft.storage/upload', {
      method: 'POST',
      headers: {
          "Content-length": fileSizeInBytes,
          "Authorization": `Bearer ${nftStorageKey}`,
      },
      body: metaData // Here, stringContent or bufferContent would also work
    }).then((response) => response.json()).then(metaUploadResponse => {
      const link = `https://${metaUploadResponse.value.cid}.ipfs.dweb.link`
      log.info("Upload End")
      log.debug([link, mediaURL])
      return [link, mediaURL];
    }).catch((error) => {
      log.debug(error)
      throw new Error(`Metadata Upload Error: ${error}`);
    });
  }).catch((error) => {
    log.debug(error)
    throw new Error(`Media Upload Error: ${error}`);
  } );
}
