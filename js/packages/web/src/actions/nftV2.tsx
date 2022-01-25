import { Connection, PublicKey } from "@solana/web3.js";
import { Attribute, ENDPOINT_NAME, WalletSigner } from "@oyster/common";
import { Dispatch, SetStateAction } from "react";
import { Collection, Creator, DataV2, Uses } from "@metaplex-foundation/mpl-token-metadata";

class MetadataStruct {
  name: string;
  symbol: string;
  description: string;
  image: string | undefined;
  animation_url: string | undefined;
  attributes: Attribute[] | undefined;
  external_url: string;
  properties: any;
  creators: Creator[];
  sellerFeeBasisPoints: number;

  constructor(args: {
    name
    symbol
    description
    image
    animation_url
    attributes
    external_url
    properties
    creators
    sellerFeeBasisPoints
  }) {
    this.name = args.name
    this.symbol = args.symbol
    this.description = args.description
    this.image = args.image
    this.animation_url = args.animation_url
    this.attributes = args.attributes
    this.external_url = args.external_url
    this.properties = args.properties
    this.creators = args.creators
    this.sellerFeeBasisPoints = args.sellerFeeBasisPoints
  }
}

const createMetadata = async (metadata: MetadataStruct, collection: PublicKey, uses?: Uses): Promise<DataV2> => {
  const creators = metadata.creators.map(
    creator =>
      new Creator({
        address: creator.address,
        share: creator.share,
        verified: true,
      }),
  );
  return new DataV2({
    symbol: metadata.symbol,
    name: metadata.name,
    uri: ' '.repeat(64),
    sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
    creators: creators,
    collection: collection
      ? new Collection({ key: collection.toBase58(), verified: false })
      : null,
    uses: uses ? uses : null,
  }) ;
}

export const mintNftV2 = async (
  connection: Connection,
  wallet: WalletSigner | undefined,
  endpoint: ENDPOINT_NAME,
  files: File[],
  metadata: MetadataStruct,
  progressCallback: Dispatch<SetStateAction<number>>,
  uses: Uses,
  collection: PublicKey,
): Promise<DataV2> => {
  const data = createMetadata(metadata, collection, uses)
  if (!data) return;
  const realFiles: File[] = [
    ...files,
    new File([JSON.stringify(metadataContent)], RESERVED_METADATA),
  ];
}
