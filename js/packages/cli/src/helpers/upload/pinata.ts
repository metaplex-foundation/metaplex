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
  const manifestJson = JSON.parse(manifestBuffer.toString('utf8'));

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