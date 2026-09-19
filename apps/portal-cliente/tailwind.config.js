export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          DEFAULT: '#0E1A2B',
          900: '#0B1421',
          800: '#0E1A2B',
          700: '#17293F',
          600: '#274056',
        },
        slateux: {
          50: '#F7F8FA',
          100: '#EFF1F5',
          200: '#E2E6EC',
          300: '#CBD2DC',
          400: '#98A3B2',
          500: '#6B7787',
          600: '#4A5565',
        },
        brass: {
          50: '#FBF6EC',
          100: '#F3E7CC',
          400: '#C9A24B',
          500: '#B08833',
          600: '#8F6C25',
        },
        danger: {
          50: '#FEF2F2',
          200: '#FBD5D5',
          500: '#D64545',
          700: '#A32424',
        },
        success: {
          50: '#F0F8F3',
          200: '#CBE5D5',
          500: '#2F8F5B',
          700: '#20653F',
        },
        warn: {
          50: '#FEF7EC',
          200: '#F8E2BE',
          500: '#C1811A',
          700: '#8F5E10',
        },
      },
      borderRadius: {
        card: '14px',
        field: '10px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(14, 26, 43, 0.04), 0 12px 32px -12px rgba(14, 26, 43, 0.14)',
        field: '0 1px 2px rgba(14, 26, 43, 0.05)',
      },
    },
  },
  plugins: [],
}
