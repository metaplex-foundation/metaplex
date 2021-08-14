export interface Auction {
  name: string;
  auctionerName: string;
  auctionerLink: string;
  highestBid: number;
  solAmt: number;
  link: string;
  image: string;
}

// TODO: review props
export interface Artist {
  address: string;
  name?: string;
  link?: string;
  image?: string;
  about?: string;
  description?: string;
  verified?: boolean;

  share?: number;
}

export enum ArtType {
  Master,
  Print,
  NFT,
}
export interface Art {
  uri: string | undefined;
  mint: string | undefined;
  link: string;
  title: string;
  artist: string;
  seller_fee_basis_points?: number;
  creators?: Artist[];
  type: ArtType;
  edition?: number;
  supply?: number;
  maxSupply?: number;
}

export interface Presale {
  targetPricePerShare?: number;
  pricePerShare?: number;
  marketCap?: number;
}
