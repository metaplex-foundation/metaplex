import names from '../config/userNames.json';

type ArtistInfo = Partial<{
  name: string;
  link: string;
  image: string;
  about: string;
  description: string;
}>;

type AddressField = { address: string };
const namesList = names as Record<string, ArtistInfo>;

export const getArtistInfo = (address: string) => {
  return namesList[address] || ({} as ArtistInfo);
};

export const populateArtistInfo = <T extends AddressField>(artist: T) => {
  const nameInfo = getArtistInfo(artist.address);
  return { ...nameInfo, ...artist };
};
