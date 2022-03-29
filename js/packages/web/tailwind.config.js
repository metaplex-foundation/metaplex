module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: 'var(--ant-primary-color)',
        'primary-hover': 'var(--ant-primary-color-hover)',
        secondary: 'var(--secondary)',
        'color-border': 'var(--color-border, #121212)',
        'color-text': 'var(--color-text, #fff)',
        'color-text-accent': 'var(--color-text-accent,#000)',
        main: 'var(--main)',
        base: 'var(--color-base)',
        'base-bold': 'var(--color-base-bold)',
        background: 'var(--background)',
        header: 'var(--header)',
        accent: 'var(--accent)',
        gray: {
          25: '#FEFEFE',
          50: '#F4F4F4',
          100: '#E0E0E0',
          200: '#C6C6C6',
          300: '#A8A8A8',
          400: '#8D8D8D',
          500: '#6F6F6F',
          600: '#525252',
          700: '#393939',
          800: '#262626',
          900: '#171717',
        },
        'hola-black': '#262626',
      },
      fontFamily: {
        'theme-title': "var(--family-title, 'Graphik Web', sans-serif)",
        'theme-text': "var(--family-text, 'Graphik Web', sans-serif)",
      },
    },
  },
  plugins: [],
};
