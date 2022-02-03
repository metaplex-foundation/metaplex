module.exports = {
  fontSources: ['Google Fonts'],

  fontStack: [
    {
      name: 'Sora',
      cssClass: 'text-serif',
      link: 'https://fonts.google.com/specimen/Sora',
    },
    {
      name: 'Roboto',
      cssClass: 'text-sans',
      link: 'https://fonts.google.com/specimen/Roboto',
    },
    {
      name: 'IBM Plex Mono',
      cssClass: 'text-mono',
      link: 'https://fonts.google.com/specimen/IBM+Plex+Mono',
    },
  ],

  fontFamily: {
    sans: ['"Roboto"', 'sans-serif'],
    serif: ['"Sora"', 'serif'],
    heading: ['"Sora"', 'sans-serif'],
    mono: ['"IBM Plex Mono"', 'monospace'],
    code: ['"IBM Plex Mono"', 'monospace'],
  },

  headings: {
    fontFamily: '"Sora", sans-serif',

    fontSize: {
      display: [
        '64px',
        {
          label: 'Display',
          lineHeight: '86px',
          letterSpacing: '-1.25px',
        },
      ],
      h1: [
        '52px',
        {
          label: 'H1',
          lineHeight: '72px',
          letterSpacing: '-1.25px',
        },
      ],
      h2: [
        '40px',
        {
          label: 'H2',
          lineHeight: '58px',
          letterSpacing: '-0.74px',
        },
      ],
      h3: [
        '32px',
        {
          label: 'H3',
          lineHeight: '48px',
          letterSpacing: '-0.64px',
        },
      ],
      h4: [
        '24px',
        {
          label: 'H4',
          lineHeight: '36px',
          letterSpacing: '-0.33px',
        },
      ],
      h5: [
        '20px',
        {
          label: 'H5',
          lineHeight: '32px',
          letterSpacing: '-0.26px',
        },
      ],
      h6: [
        '18px',
        {
          label: 'H6',
          lineHeight: '32px',
          letterSpacing: '-0.26px',
        },
      ],
    },

    fontWeight: {
      display: 700,
      h1: 700,
      h2: 700,
      h3: 700,
      h4: 700,
      h5: 600,
      h6: 600,
    },
  },

  body: {
    fontFamily: ['"Roboto", sans-serif', '"IBM Plex Mono", monospace'],
    fontSize: {
      base: [
        '16px',
        {
          label: 'Base',
          lineHeight: '32px',
          letterSpacing: '-0.18px',
        },
      ],

      xl: [
        '28px',
        {
          label: 'Text Extra Large',
          lineHeight: '44px',
          letterSpacing: '-0.2px',
        },
      ],
      lg: [
        '18px',
        {
          label: 'Text Large',
          lineHeight: '32px',
          letterSpacing: '-0.26px',
        },
      ],
      md: [
        '14px',
        {
          label: 'Text Medium',
          lineHeight: '24px',
          letterSpacing: '-0.18px',
        },
      ],
      sm: [
        '12px',
        {
          label: 'Text Small',
          lineHeight: '20px',
          letterSpacing: '-0.01px',
        },
      ],
      xs: [
        '10px',
        {
          label: 'Text Extra Small',
          lineHeight: '20px',
          letterSpacing: '-0.01px',
        },
      ],
    },
    fontWeight: {
      300: 300,
      400: 400,
      500: 500,
      600: 600,
      700: 700,
      800: 800,
      900: 900,
    },
  },
};
