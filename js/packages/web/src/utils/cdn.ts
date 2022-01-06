const ARWEAVE_CDN = process.env.NEXT_PUBLIC_ARWEAVE_CDN;
const IPFS_CDN = process.env.NEXT_PUBLIC_IPFS_CDN;
const IPFS_IMAGE_CDN = process.env.NEXT_PUBLIC_IPFS_IMAGE_CDN;

export const maybeCDN = (uri: string) => {
  if (ARWEAVE_CDN && uri.includes('arweave.net')) {
    const res = uri.replace(
      /https:\/\/(www.)?arweave\.net(:443)?/g,
      ARWEAVE_CDN,
    );

    return res;
  } else if (IPFS_CDN && uri.includes('ipfs.dweb')) {
    const res = uri.replace(/https:\/\/(.*).ipfs.dweb.*$/g, `${IPFS_CDN}/$1`);

    return res;
  } else {
    return uri;
  }
};

export const maybeImageCDN = (imageUri: string) => {
  if (IPFS_IMAGE_CDN && imageUri.includes('ipfs.dweb')) {
    const res = imageUri.replace(
      /https:\/\/(.*).ipfs.dweb.*$/g,
      `${IPFS_IMAGE_CDN}/$1`,
    );

    return res;
  } else {
    return imageUri;
  }
};
