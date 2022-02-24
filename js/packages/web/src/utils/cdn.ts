const IPFS_CDN = process.env.NEXT_PUBLIC_IPFS_CDN;
const IPFS_IMAGE_CDN = process.env.NEXT_PUBLIC_IPFS_IMAGE_CDN;

export const maybeCDN = (uri: string) => {
  if (IPFS_CDN && uri.includes('ipfs.dweb')) {
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
