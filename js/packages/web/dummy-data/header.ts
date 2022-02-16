import { categories } from './categories'

export const header = {
  menu: [
    {
      label: 'Explore',
      value: '/explore',
      subMenu: [...categories],
    },
    {
      label: 'Create',
      value: '/submit-collection',
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
          value: '/static-content',
          isDirectLink: true,
        },
        {
          label: 'What are NFTs?',
          value: '/static-content',
          isDirectLink: true,
        },
        {
          label: 'Crypto + NFT Guide',
          value: '/static-content',
          isDirectLink: true,
        },
        {
          label: 'About Karmaverse',
          value: '/static-content',
          isDirectLink: true,
        },
        {
          label: 'Philanthropy',
          value: '/static-content',
          isDirectLink: true,
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
          value: 'https://twitter.com/home',
          isDirectLink: true,
          isNewTab: true,
        },
        {
          label: 'Discord',
          value: 'https://discord.com/',
          isDirectLink: true,
          isNewTab: true,
        },
        {
          label: 'Blog',
          value: 'blog',
          isDirectLink: true,
        },
        {
          label: 'Merch',
          value: 'merch',
          isDirectLink: true,
        },
      ],
    },
  ],
}
