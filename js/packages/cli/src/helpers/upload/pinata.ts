import log from 'loglevel';
import fetch from 'node-fetch';
import FormData from 'form-data';
import fs from 'fs';

async function sleep(ms: number): Promise<void> {
  console.log("waiting");
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function pinataUpload(
  jwt: string,
  gateway: string,
  image: string,
  manifestBuffer: Buffer,
) {
  try {
    const gatewayUrl = gateway ? `${gateway}` : `https://ipfs.io`;

    const manifestJson = JSON.parse(fs.readFileSync(manifestBuffer, 'utf-8'));

    const data = new FormData();
    data.append("file", fs.createReadStream(image));

    const resImage = await fetch(
      `https://api.pinata.cloud/pinning/pinFileToIPFS`,
      {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
        method: 'POST',
        body: data
      },
    );

    const imageJson = await resImage.json();

    await sleep(500);

    const { IpfsHash: imageHash } = imageJson;

    const mediaUrl = `${gatewayUrl}/ipfs/${imageHash}`;
    manifestJson.image = mediaUrl;
    manifestJson.properties.files = manifestJson.properties.files.map(f => {
      return { ...f, uri: mediaUrl };
    });

    log.info('uploaded image: ', mediaUrl);

    fs.writeFileSync("tempJson.json", JSON.stringify(manifestJson));

    const jsonData = new FormData();
    jsonData.append("file", fs.createReadStream("tempJson.json"));

    const resJson = await fetch(
      `https://api.pinata.cloud/pinning/pinFileToIPFS`,
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

    const link = `${gatewayUrl}/ipfs/${jsonHash}`;
    log.info('uploaded manifest: ', link);

    return [link, mediaUrl];
  } catch (error) {
    throw error;
  }
}