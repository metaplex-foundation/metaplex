import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CACHE_PATH } from './constants';
import path from 'path';
import fs from 'fs';
import FormData from 'form-data';
import fetch from 'node-fetch';

export const getUnixTs = () => {
  return new Date().getTime() / 1000;
};

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function fromUTF8Array(data: number[]) {
  // array of bytes
  let str = '',
    i;

  for (i = 0; i < data.length; i++) {
    const value = data[i];

    if (value < 0x80) {
      str += String.fromCharCode(value);
    } else if (value > 0xbf && value < 0xe0) {
      str += String.fromCharCode(((value & 0x1f) << 6) | (data[i + 1] & 0x3f));
      i += 1;
    } else if (value > 0xdf && value < 0xf0) {
      str += String.fromCharCode(
        ((value & 0x0f) << 12) |
          ((data[i + 1] & 0x3f) << 6) |
          (data[i + 2] & 0x3f),
      );
      i += 2;
    } else {
      // surrogate pair
      const charCode =
        (((value & 0x07) << 18) |
          ((data[i + 1] & 0x3f) << 12) |
          ((data[i + 2] & 0x3f) << 6) |
          (data[i + 3] & 0x3f)) -
        0x010000;

      str += String.fromCharCode(
        (charCode >> 10) | 0xd800,
        (charCode & 0x03ff) | 0xdc00,
      );
      i += 3;
    }
  }

  return str;
}

export function chunks(array, size) {
  return Array.apply(0, new Array(Math.ceil(array.length / size))).map(
    (_, index) => array.slice(index * size, (index + 1) * size),
  );
}

export function cachePath(env: string, cacheName: string) {
  return path.join(CACHE_PATH, `${env}-${cacheName}`);
}

export function loadCache(cacheName: string, env: string) {
  const path = cachePath(env, cacheName);
  return fs.existsSync(path)
    ? JSON.parse(fs.readFileSync(path).toString())
    : undefined;
}

export function saveCache(cacheName: string, env: string, cacheContent) {
  fs.writeFileSync(cachePath(env, cacheName), JSON.stringify(cacheContent));
}

export function parsePrice(price): number {
  return Math.ceil(parseFloat(price) * LAMPORTS_PER_SOL);
}

export async function upload(data: FormData, manifest, index) {
  console.log(`trying to upload ${index}.png: ${manifest.name}`);
  return await (
    await fetch(
      'https://us-central1-principal-lane-200702.cloudfunctions.net/uploadFile4',
      {
        method: 'POST',
        // @ts-ignore
        body: data,
      },
    )
  ).json();
}
