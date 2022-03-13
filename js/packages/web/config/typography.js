const colors = require('./colors'),
  palette = colors.palette

module.exports = {
  fontSources: ['Google Fonts'],

  fontStack: [
    {
      name: 'Rajdhani',
      className: 'text-serif',
      link: 'https://fonts.google.com/specimen/Rajdhani',
    },
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
    serif: ['"Rajdhani"', 'serif'],
    heading: ['"Rajdhani"', 'sans-serif'],
    display: ['"Righteous"', 'sans-serif'],
    mono: ['"IBM Plex Mono"', 'monospace'],
    code: ['"IBM Plex Mono"', 'monospace'],
  },

  display: {
    fontFamily: '"Righteous", sans-serif',

    fontSize: {
      'display-xl': [
        '60px',
        {
          label: 'Display XL',
          lineHeight: 'normal',
          letterSpacing: '-1.25px',
        },
      ],
      'display-lg': [
        '52px',
        {
          label: 'Display LG',
          lineHeight: 'normal',
          letterSpacing: '-0.18px',
        },
      ],
      'display-base': [
        '36px',
        {
          label: 'Display Base',
          lineHeight: 'normal',
          letterSpacing: '-0.18px',
        },
      ],
    },

    fontWeight: {},
  },

  headings: {
    fontFamily: '"Rajdhani", sans-serif',

    fontSize: {
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
          lineHeight: '52px',
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
        '28px',
        {
          label: 'Text Extra Large',
          lineHeight: '44px',
          letterSpacing: '-0.2px',
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
          letterSpacing: '-0.18px',
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
