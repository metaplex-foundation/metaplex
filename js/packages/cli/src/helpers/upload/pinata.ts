import log from 'loglevel';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function pinataUpload(
  jwt: string,
  gateway: string,
  image: string,
  manifestBuffer: Buffer,
) {

  // const mediaHash = await uploadToIpfs(globSource(image, { recursive: true }));
  // log.debug('mediaHash:', mediaHash);
  // const mediaUrl = `https://ipfs.io/ipfs/${mediaHash}`;
  // log.debug('mediaUrl:', mediaUrl);
  // const authIFPS = Buffer.from(tokenIfps).toString('base64');
  // await fetch(`https://ipfs.infura.io:5001/api/v0/pin/add?arg=${mediaHash}`, {
  //   headers: {
  //     Authorization: `Basic ${authIFPS}`,
  //   },
  //   method: 'POST',
  // });
  // log.info('uploaded image for file:', image);

  const manifestJson = JSON.parse(manifestBuffer.toString('utf8'));
  // console.log({ manifestJson, image, jwt });
  // log.debug({manifestJson});
  // log.debug({image});
  // log.debug({jwt});
  // manifestJson.image = mediaUrl;
  // manifestJson.properties.files = manifestJson.properties.files.map(f => {
  //   return { ...f, uri: mediaUrl };
  // });

  // const manifestHash = await uploadToIpfs(
  //   Buffer.from(JSON.stringify(manifestJson)),
  // );

  const data = new FormData();
  data.append("file", fs.createReadStream(image));

  const resImage = await fetch(
    `https://testapi.pinata.cloud/pinning/pinFileToIPFS`,
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      method: 'POST',
      body: data
    },
  );

  const imageJson = await resImage.json();
  const { IpfsHash: imageHash } = imageJson;

  fs.writeFileSync("tempJson.json", JSON.stringify(manifestJson));

  const jsonData = new FormData();
  jsonData.append("file", fs.createReadStream("tempJson.json"));

  const resJson = await fetch(
    `https://testapi.pinata.cloud/pinning/pinFileToIPFS`,
    {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      method: 'POST',
      body: jsonData
    },
  );

  const hashJson = await resJson.json();
  const { IpfsHash: jsonHash } = hashJson;

  await sleep(500);

  const gatewayUrl = gateway ? `${gateway}` : `https://ipfs.io`;
  const link = `${gatewayUrl}/ipfs/${jsonHash}`;
  const mediaUrl = `${gatewayUrl}/ipfs/${imageHash}`;
  log.info('uploaded manifest: ', link);

  return [link, mediaUrl];
}