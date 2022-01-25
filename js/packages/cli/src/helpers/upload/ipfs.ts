import log from 'loglevel';
import fetch from 'node-fetch';
import { create, globSource } from 'ipfs-http-client';

export interface ipfsCreds {
  projectId: string;
  secretKey: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function ipfsUpload(
  ipfsCredentials: ipfsCreds,
  image: string,
  animation: string,
  manifestBuffer: Buffer,
) {
  const tokenIfps = `${ipfsCredentials.projectId}:${ipfsCredentials.secretKey}`;
  // @ts-ignore
  const ipfs = create('https://ipfs.infura.io:5001');

  const uploadToIpfs = async source => {
    const { cid } = await ipfs.add(source).catch();
    return cid;
  };

  const imageHash = await uploadToIpfs(globSource(image, { recursive: true }));
  log.debug('imageHash:', imageHash);
  const imageUrl = `https://ipfs.io/ipfs/${imageHash}`;
  log.info('imageUrl:', imageUrl);
  const authIFPS = Buffer.from(tokenIfps).toString('base64');
  await fetch(`https://ipfs.infura.io:5001/api/v0/pin/add?arg=${imageHash}`, {
    headers: {
      Authorization: `Basic ${authIFPS}`,
    },
    method: 'POST',
  });
  log.info('uploaded image for file:', image);

  await sleep(500);

  let animationUrl = undefined;
  if (animation) {
    const animationHash = await uploadToIpfs(globSource(animation, { recursive: true }));
    log.debug('animationHash:', animationHash);
    animationUrl = `https://ipfs.io/ipfs/${animationHash}`;
    log.info('animationUrl:', animationUrl);
    await fetch(`https://ipfs.infura.io:5001/api/v0/pin/add?arg=${animationHash}`, {
      headers: {
        Authorization: `Basic ${authIFPS}`,
      },
      method: 'POST',
    });
    log.info('uploaded animation for file:', animation);

    await sleep(500);
  }

  const manifestJson = JSON.parse(manifestBuffer.toString('utf8'));
  manifestJson.image = imageUrl;
  if (animation) {
    manifestJson.animation_url = animationUrl;
  }

  manifestJson.properties.files = manifestJson.properties.files.map(f => {
    if (f.type.startsWith('image/')) {
      return { ...f, uri: imageUrl };
    } else {
      return { ...f, uri: animationUrl };
    }
  });

  const manifestHash = await uploadToIpfs(
    Buffer.from(JSON.stringify(manifestJson)),
  );
  await fetch(
    `https://ipfs.infura.io:5001/api/v0/pin/add?arg=${manifestHash}`,
    {
      headers: {
        Authorization: `Basic ${authIFPS}`,
      },
      method: 'POST',
    },
  );

  await sleep(500);
  const link = `https://ipfs.io/ipfs/${manifestHash}`;
  log.info('uploaded manifest: ', link);

  return [link, imageUrl, animationUrl];
}
