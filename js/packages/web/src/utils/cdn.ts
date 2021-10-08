const ARWEAVE_CDN = process.env.NEXT_PUBLIC_ARWEAVE_CDN;

export const maybeCDN = (uri: string) => {
  if (ARWEAVE_CDN) {
    const res = uri.replace(
      /https:\/\/(www.)?arweave\.net(:443)?/g,
      ARWEAVE_CDN,
    );

    return res;
  }

  return uri;
};
