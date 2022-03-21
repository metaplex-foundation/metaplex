const colors = require('./colors'),
  palette = colors.palette

module.exports = {
  fontSources: ['Google Fonts'],

  fontStack: [
    {
      name: 'Righteous',
      className: 'text-heading',
      link: 'https://fonts.google.com/specimen/Righteous',
    },
    {
      name: 'Poppins',
      className: 'text-sans',
      link: 'https://fonts.google.com/specimen/Poppins',
    },
    {
      name: 'IBM Plex Mono',
      className: 'text-mono',
      link: 'https://fonts.google.com/specimen/IBM+Plex+Mono',
    },
  ],

  fontFamily: {
    sans: ['"Poppins"', 'sans-serif'],
    serif: ['"Poppins"', 'serif'],
    heading: ['"Poppins"', 'sans-serif'],
    display: ['"Righteous"', 'sans-serif'],
    mono: ['"IBM Plex Mono"', 'monospace'],
    code: ['"IBM Plex Mono"', 'monospace'],
  },

  display: {
    fontFamily: '"Righteous", sans-serif',

    fontSize: {
      'display-xl': [
        '72px',
        {
          label: 'Display XL',
          lineHeight: '96px',
          letterSpacing: '-1.25px',
        },
      ],
      'display-lg': [
        '60px',
        {
          label: 'Display LG',
          lineHeight: '74px',
          letterSpacing: '-1.25px',
        },
      ],
      'display-md': [
        '52px',
        {
          label: 'Display MD',
          lineHeight: '72px',
          letterSpacing: '-0.18px',
        },
      ],
      'display-sm': [
        '36px',
        {
          label: 'Display SM',
          lineHeight: '36px',
          letterSpacing: '-0.18px',
        },
      ],
    },

    fontWeight: {},
  },

  headings: {
    fontFamily: '"Poppins", sans-serif',

    fontSize: {
      h1: [
        '52px',
        {
          label: 'H1',
          lineHeight: '72px',
          letterSpacing: '-0.18px',
        },
      ],
      h2: [
        '36px',
        {
          label: 'H2',
          lineHeight: '48px',
          letterSpacing: '-0.18px',
        },
      ],
      h3: [
        '32px',
        {
          label: 'H3',
          lineHeight: '48px',
          letterSpacing: '-0.18px',
        },
      ],
      h4: [
        '28px',
        {
          label: 'H4',
          lineHeight: '40px',
          letterSpacing: '-0.18px',
        },
      ],
      h5: [
        '20px',
        {
          label: 'H5',
          lineHeight: '26px',
          letterSpacing: '-0.18px',
        },
      ],
      h6: [
        '16px',
        {
          label: 'H6',
          lineHeight: '20px',
          letterSpacing: '-0.18px',
        },
      ],
      overline: [
        '14px',
        {
          label: 'Overline',
          lineHeight: '24px',
          letterSpacing: '3.5px',
        },
      ],
    },

    fontWeight: {},
  },

  body: {
    fontFamily: ['"Poppins", sans-serif', '"IBM Plex Mono", monospace'],
    fontSize: {
      base: [
        '16px',
        {
          label: 'Base',
          lineHeight: '28px',
          letterSpacing: '-0.18px',
        },
      ],
      xl: [
        '24px',
        {
          label: 'Text Extra Large',
          lineHeight: '32px',
          letterSpacing: '-0.18px',
        },
      ],
      lg: [
        '20px',
        {
          label: 'Text Large',
          lineHeight: 'normal',
          letterSpacing: '-0.18px',
        },
      ],
      md: [
        '14px',
        {
          label: 'Text Medium',
          lineHeight: '24px',
          letterSpacing: '-0.09px',
        },
      ],
      sm: [
        '12px',
        {
          label: 'Text Small',
          lineHeight: 'normal',
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
}
