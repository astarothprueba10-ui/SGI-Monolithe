export default {content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#F4F7FA',
          100: '#E5EDF5',
          200: '#C7D8E8',
          300: '#9BB6D2',
          400: '#6487AF',
          500: '#3B628F',
          600: '#2A4C74',
          700: '#1E3A5C',
          800: '#152B45',
          900: '#0E1F33',
          950: '#081420',
        },
        accent: {
          100: '#F7EFDD',
          300: '#E0C68C',
          400: '#D9B168',
          500: '#C39A47',
          600: '#A67F34',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(13, 31, 51, 0.04), 0 1px 3px 0 rgba(13, 31, 51, 0.06)',
        pop: '0 8px 24px -6px rgba(13, 31, 51, 0.18), 0 2px 6px -2px rgba(13, 31, 51, 0.10)',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
}
