import Head from 'next/head';

export const description = 'THUGBIRDZ NFT: 3333 thugs dropping on the 22nd of August';
export const title = 'THUGBIRDZ - birds that are thugs yo';

const keywords = `
  metaplex, metaplex nft, solana nft, CryptoKickers, phantom wallet, solana nft gallery, gamerplex, SOLANIMALS, nft, nft search, nft viewer, opensea, bakeryswap, Non-Fungible Token, nft marketplace, crypto punks, CryptoKitties, binance search, bsc, rarible, superrare, SolanaMonkeyBusiness, Solana Monkey, sollamas, apes
`;

export const MetaTitles = () => {
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@thugbirdz" />
      <meta name="twitter:creator" content="@thugbirdz" />

      <meta property="og:site_name" content="thugbirdz.com" key="site_name" />
      <meta
        property="og:title"
        content="birds that are thugs yo"
        key="title"
      />
      <meta property="og:description" content={description} key="description" />

      <meta property="og:type" content="website" />
      <meta property="og:url" content="https://www.thugbirdz.com/" />

      <meta
        property="og:image"
        content="https://www.thugbirdz.com/banner.png"
      />
      <meta property="og:image:alt" content="thugbirdz.com" key="image:alt" />
    </Head>
  );
};

export default MetaTitles;
