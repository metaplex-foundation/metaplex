import { categories } from './categories';

export const header = {
  menu: [
    {
      label: 'Explore',
      value: '/explore',
      subMenu: [...categories],
    },
    {
      label: 'Create',
      value: '/create',
    },
    {
      label: 'Donate',
      value: '/donate',
      subMenu: [
        {
          label: 'Donate Crypto',
          value: 'donate-crypto',
        },
        {
          label: 'Donate USD',
          value: 'donate-usd',
        },
        {
          label: 'Fundraise',
          value: 'fundraise',
        },
        {
          label: 'Get Involved',
          value: 'get-involved',
        },
        {
          label: 'For Nonprofits',
          value: 'for-nonprofits',
        },
      ],
    },
    {
      label: 'Learn',
      value: '/learn',
      subMenu: [
        {
          label: 'How to buy',
          value: '/how-to-buy',
        },
        {
          label: 'What are NFTs?',
          value: '/what-are-nfts',
        },
        {
          label: 'Crypto + NFT Guide',
          value: '/crypto-nft-guide',
        },
        {
          label: 'About Karmaverse',
          value: '/about-karmaverse',
        },
        {
          label: 'Philanthropy',
          value: '/philanthropy',
        },
      ],
    },
    {
      label: 'Community',
      value: '/community',
      subMenu: [
        {
          label: 'Become an ambassador',
          value: 'become-an-ambassador',
        },
        {
          label: 'Twitter',
          value: 'twitter',
        },
        {
          label: 'Discord',
          value: 'discord',
        },
        {
          label: 'Blog',
          value: 'blog',
        },
        {
          label: 'Merch',
          value: 'merch',
        },
      ],
    },
  ],
};
