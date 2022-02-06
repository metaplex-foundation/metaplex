const defaultTheme = require('tailwindcss/defaultTheme');
const { palette } = require('./config/colors');
const appTypography = require('./config/typography');

module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/components-v2/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1098px',
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
      ...appTypography.headings.fontSize,
      ...appTypography.body.fontSize,
    },
    fontWeight: {
      ...defaultTheme.fontWeight,
      ...appTypography.headings.fontWeight,
      ...appTypography.body.fontWeight,
    },
    extend: {
      colors: {
        ...palette,
      },
    },
  },
  plugins: [
    require('@tailwindcss/line-clamp'),
    require('@tailwindcss/typography'),
    require('tailwind-scrollbar'),
  ],
};
