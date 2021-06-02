import { Auction, Artist, Presale } from '../../types';

export const sampleAuction: Auction = {
  name: 'Liquidity Pool',
  auctionerName: 'Rama XI',
  auctionerLink: '/address/4321dcba',
  highestBid: 23000,
  solAmt: 200,
  link: '/auction/1234abcd',
  image: 'img/auction1.jpg',
  endingTS: 1618447663000,
};

export const sampleAuctions: Array<Auction> = [
  {
    name: 'Team Trees',
    auctionerName: 'NFToros',
    auctionerLink: '/address/4321dcba',
    highestBid: 23000,
    solAmt: 115,
    link: '/auction/1234abcd',
    image: 'img/auction2.jpg',
    endingTS: 1618447663000,
  },
  {
    name: 'Miko 4',
    auctionerName:
      'Hello World Hello World Hello World Hello World Hello World Hello World Hello World Hello World ',
    auctionerLink: '/address/4321dcba',
    highestBid: 13000,
    solAmt: 75,
    link: '/auction/1234abcd',
    image: 'img/auction3.jpg',
    endingTS: 1618447663000,
  },
  {
    name: 'Tell Me',
    auctionerName: 'Supper Club',
    auctionerLink: '/address/4321dcba',
    highestBid: 24000,
    solAmt: 120,
    link: '/auction/1234abcd',
    image: 'img/auction4.jpg',
    endingTS: 1618447663000,
  },
  {
    name: 'Saucy',
    auctionerName: 'Mr. Momo',
    auctionerLink: '/address/4321dcba',
    highestBid: 23000,
    solAmt: 200,
    link: '/auction/1234abcd',
    image: 'img/auction5.jpg',
    endingTS: 1618447663000,
  },
  {
    name: 'Haze',
    auctionerName: 'Daily Dose',
    auctionerLink: '/address/4321dcba',
    highestBid: 23000,
    solAmt: 200,
    link: '/auction/1234abcd',
    image: 'img/auction6.jpg',
    endingTS: 1618447663000,
  },
  {
    name: 'Wounderground',
    auctionerName: 'The Maze',
    auctionerLink: '/address/4321dcba',
    highestBid: 23000,
    solAmt: 200,
    link: '/auction/1234abcd',
    image: 'img/auction7.jpg',
    endingTS: 1618447663000,
  },
];

export const sampleArtists: Array<Artist> = [
  {
    name: 'Yuzu415',
    link: '/artist/1234abcd',
    image: 'img/artist1.jpeg',
    itemsAvailable: 7,
    itemsSold: 215,
  },
  {
    name: 'Mischa',
    link: '/artist/1234abcd',
    image: 'img/artist2.jpeg',
    itemsAvailable: 2,
    itemsSold: 215,
  },
  {
    name: 'Sammy',
    link: '/artist/1234abcd',
    image: 'img/artist3.jpeg',
    itemsAvailable: 7,
    itemsSold: 215,
  },
  {
    name: 'Wonderful',
    link: '/artist/1234abcd',
    image: 'img/artist4.jpeg',
    itemsAvailable: 7,
    itemsSold: 215,
  },
];

export const sampleArtist: Artist = {
  name: 'Yuzu415',
  link: '/artist/1234abcd',
  image: '/img/artist3.jpeg',
  about:
    'NFTARTIST is an Artist & Director working in entertainment for the past 15 years. Experience in film, commercial and live events, his work serves as a means to visual and methodological study.',
};

export const samplePresale: Presale = {
  endingTS: 1618447663000,
  targetPricePerShare: 5,
  pricePerShare: 4.39,
  marketCap: 328,
};
