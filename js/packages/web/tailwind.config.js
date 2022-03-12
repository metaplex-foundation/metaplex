const defaultTheme = require('tailwindcss/defaultTheme')
const { palette } = require('./config/colors')
const appTypography = require('./config/typography')

const round = num =>
  num
    .toFixed(7)
    .replace(/(\.[0-9]+?)0+$/, '$1')
    .replace(/\.0$/, '')
const rem = px => `${round(px / 16)}rem`
const em = (px, base) => `${round(px / base)}em`

module.exports = {
  mode: 'jit',
  important: false,
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/components-v2/**/*.{js,ts,jsx,tsx}',
    './src/ui/**/*.{js,ts,jsx,tsx}',
    './src/views/**/*.{js,ts,jsx,tsx}',
    '../common/src/**/*.{js,ts,jsx,tsx}',
    './dummy-data/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1240px',
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '16px',
        sm: '16px',
        md: '32px',
        lg: '0',
      },
    },
    fontFamily: {
      ...appTypography.fontFamily,
    },
    fontSize: {
      ...appTypography.display.fontSize,
      ...appTypography.headings.fontSize,
      ...appTypography.body.fontSize,
    },
    fontWeight: {
      ...defaultTheme.fontWeight,
      ...appTypography.display.fontWeight,
      ...appTypography.headings.fontWeight,
      ...appTypography.body.fontWeight,
    },
    boxShadow: {
      DEFAULT: '0px 6px 12px -6px rgba(18, 16, 55, 0.12), 0px 8px 24px -4px rgba(18, 16, 55, 0.08)',
      none: 'none',
    },
    borderRadius: {
      DEFAULT: '12px',
      full: '9999px',
    },
    dropShadow: {
      'DEFAULT': '0px_3px_12px_rgba(1,56,106,0.08)',
      '3xl': '0 35px 35px rgba(0, 0, 0, 0.25)',
    },
    extend: {
      colors: {
        ...palette,
      },
      backgroundImage: {
        launchpad:
          'linear-gradient(99.28deg, #021228 6.43%, #1D105E 17.29%, #250439 69.73%, #03172B 95.71%)',
      },
      transform: {
        'hero-card-1': 'matrix(1, -0.1, 0.1, 1, 0, 0)',
        'hero-card-1-hover': 'matrix(1, -0.1, 0.1, 1, 0, 0)',
        'hero-card-2': 'matrix(0.98, 0.17, -0.17, 0.98, 0, 0)',
        'hero-card-2-hover': 'matrix(0.98, 0.17, -0.17, 0.98, 0, 0)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
    require('@tailwindcss/typography'),
    require('tailwind-scrollbar'),
    require('tailwindcss-children'),
  ],
  variants: {
    scrollbar: ['rounded'],
    flex: ['children', 'default'],
    inlineFlex: ['children', 'default'],
  },
}
