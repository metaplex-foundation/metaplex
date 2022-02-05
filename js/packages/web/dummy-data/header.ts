import { categories } from './categories';

export const header = {
  menu: [
    {
      label: 'Get started',
      value: '/get-started',
    },
    {
      label: 'Explore',
      value: '/explore',
      subMenu: [...categories],
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
      label: 'Stats',
      value: '/stats',
    },
    {
      label: 'Community',
      value: '/community',
    },
  ],
};
