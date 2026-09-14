/** @type {import('tailwindcss').Config} */
export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      colors: {
        night: {
          DEFAULT: '#000020',
          950: '#000020',
          900: '#05052B',
          800: '#0C0C3A',
          700: '#16164F',
          600: '#242465',
          400: '#6B6B93',
        },
        brand: {
          DEFAULT: '#008000',
          700: '#00660B',
          600: '#008000',
          500: '#119B23',
          100: '#DFF0DF',
          50: '#F1F8F1',
        },
        gold: {
          DEFAULT: '#C49A3A',
          600: '#A87F27',
          400: '#D9B968',
          100: '#F6EEDB',
        },
        bone: '#F8F7F3',
        line: '#E6E4DD',
        ink: '#14142B',
        muted: '#5C5C70',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,32,0.04), 0 8px 24px -12px rgba(0,0,32,0.18)',
        lift: '0 2px 4px rgba(0,0,32,0.05), 0 18px 40px -18px rgba(0,0,32,0.30)',
      },
      maxWidth: {
        shell: '1240px',
      },
    },
  },
  plugins: [],
}
