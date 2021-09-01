import names from '../config/userNames.json';

interface ArtistInfo {
  name?: string;
  link?: string;
  image?: string;
  about?: string;
  description?: string;
}

const NAME_LIST: Record<string, ArtistInfo> = names;

export const getArtistInfo = (address: string) => {
  return NAME_LIST[address] || ({} as ArtistInfo);
};

export const populateArtistInfo = <T extends { address?: string | null }>(
  artist: T,
) => {
  const nameInfo = artist.address ? getArtistInfo(artist.address) : '';
  return { ...nameInfo, ...artist };
};
