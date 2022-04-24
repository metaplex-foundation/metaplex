import { Keypair } from '@solana/web3.js';
import * as fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import FormData from 'form-data';
import log from 'loglevel';

export async function djibUpload(
  index: string,
  image: string,
  animation: string,
  manifestBuffer: Buffer,
  walletKeyPair: Keypair,
  anchorProgram: any,
  network: string,
) {
  const djibRPC =
    network === 'mainnet-beta'
      ? 'https://mainrpc.djib.io'
      : network === 'testnet'
      ? 'https://testrpc.djib.io'
      : 'https://devrpc.djib.io';

  // upload file on djib network
  async function uploadFile(fileBuff: any, contentType: any, filename: string) {
    const data = new FormData();
    data.append('publickey', walletKeyPair.publicKey.toString());
    data.append('type', 'public');
    data.append('files[]', fileBuff, {
      filename: filename,
      contentType: contentType,
    });
    const { link, error } = await fetch(`${djibRPC}/upload`, {
      method: 'POST',
      body: data,
    })
      .then(function (res: any) {
        return res.json();
      })
      .then(function (res: any) {
        if (res.result == undefined || res.result.length == 0)
          return { link: '', error: `No Response (${djibRPC}/upload)` };
        return { link: res.result[0], error: undefined };
      })
      .catch(function (e: any) {
        return { link: '', error: e.toString() };
      });
    return {
      link,
      error,
    };
  }

  // upload controller
  async function doUpload(fileBuff: any, filename: any, contentType: any) {
    const linkObj = await uploadFile(fileBuff, contentType, filename);
    if (linkObj.error != undefined) return { error: linkObj.error };
    log.debug(`Uploaded link for ${filename}: ${linkObj.link}`);
    return { error: undefined, link: linkObj.link };
  }

  // process media file
  async function processMedia(filePath: string) {
    const fileExt = path.extname(filePath);
    const fileName = `${index}${fileExt}`;
    const fileContentType = `image/${fileExt.replace('.', '')}`;
    return await doUpload(
      fs.createReadStream(filePath),
      fileName,
      fileContentType,
    );
  }

  // process manifest file
  async function processJson(manifestJson: any) {
    const strManifest = JSON.stringify(manifestJson);
    const jsonBuff = Buffer.from(strManifest);
    const fileName = `${index}.json`;
    const fileContentType = `text/json`;
    return await doUpload(jsonBuff, fileName, fileContentType);
  }

  const imageObj = await processMedia(image);
  if (imageObj.error != undefined) {
    log.error(imageObj.error);
    return null;
  }
  const animationObj = animation ? await processMedia(animation) : undefined;
  if (animationObj && animationObj.error != undefined) {
    log.error(animationObj.error);
    return null;
  }
  const manifestJson = JSON.parse(manifestBuffer.toString('utf8'));
  manifestJson.image = imageObj.link;
  if (animation) manifestJson.animation_url = animationObj.link;
  const manifestObj = await processJson(manifestJson);
  if (manifestObj.error != undefined) {
    log.error(manifestObj.error);
    return null;
  }
  return [
    manifestObj.link,
    imageObj.link,
    animationObj ? animationObj.link : undefined,
  ];
}
