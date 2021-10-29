import fs from 'fs';
import Arweave from 'arweave';

// Get instance as function to make bootup time shorter and to provide singleton
let _ARInstace;
export const getARInstance = () => {
  if (!_ARInstace) {
    _ARInstace = Arweave.init({
      host: 'arweave.net',
      port: 443,
      protocol: 'https',
    });
  }
  return _ARInstace;
};

export const uploadToArweave = async transaction => {
  const arweave = getARInstance();
  const uploader = await arweave.transactions.getUploader(transaction);
  while (!uploader.isComplete) {
    await uploader.uploadChunk();
    console.log(
      `${uploader.pctComplete}% complete, ${uploader.uploadedChunks}/${uploader.totalChunks}`,
    );
  }
};

export async function nativeArweaveUpload(image, manifest, jwk) {
  const arweave = getARInstance();
  const imgTx = await arweave.createTransaction(
    { data: fs.readFileSync(image) },
    jwk,
  );
  imgTx.addTag('Content-Type', image.type);
  await arweave.transactions.sign(imgTx, jwk);
  await uploadToArweave(imgTx);
  const imgLink = `https://arweave.net/${imgTx.id}`;
  manifest.image = imgLink;
  manifest.properties.files = [{ type: 'image/png', src: imgLink }];
  const metaTx = await arweave.createTransaction(
    { data: JSON.stringify({ ...manifest }) },
    jwk,
  );
  metaTx.addTag('Content-Type', 'application/json');
  await arweave.transactions.sign(metaTx, jwk);
  await uploadToArweave(metaTx);

  const link = `https://arweave.net/${metaTx.id}`;
  console.log(`Uploded file ${image} as ${link}`);
  return link;
}
