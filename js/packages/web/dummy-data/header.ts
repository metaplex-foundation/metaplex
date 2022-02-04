export const header = {
  menu: [
    {
      label: 'Get started',
      value: '/get-started',
    },
    {
      label: 'Explore',
      subMenu: [
        {
          label: 'Trending',
          parentValue: '/explore',
          childValue: 'trending',
        },
        {
          label: 'Art',
          parentValue: '/explore',
          childValue: 'art',
        },
        {
          label: 'Charity Focused',
          parentValue: '/explore',
          childValue: 'charity-focused',
        },
        {
          label: 'Gaming',
          parentValue: '/explore',
          childValue: 'gaming',
        },
        {
          label: 'Utility',
          parentValue: '/explore',
          childValue: 'utility',
        },
      ],
    },
    {
      label: 'Donate',
      subMenu: [
        {
          label: 'Donate Crypto',
          parentValue: '/donate',
          childValue: 'donate-crypto',
        },
        {
          label: 'Donate USD',
          parentValue: '/donate',
          childValue: 'donate-usd',
        },
        {
          label: 'Fundraise',
          parentValue: '/donate',
          childValue: 'fundraise',
        },
        {
          label: 'Get Involved',
          parentValue: '/donate',
          childValue: 'get-involved',
        },
        {
          label: 'For Nonprofits',
          parentValue: '/donate',
          childValue: 'for-nonprofits',
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
