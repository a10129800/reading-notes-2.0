/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FDFBF7',
          100: '#FAF8F5',
          200: '#F2ECE4',
          300: '#E7E0D3',
          400: '#D5CBB9',
        },
        ink: {
          50: '#F5F5F4',
          100: '#E7E5E4',
          400: '#78716C',
          600: '#44403C',
          700: '#292524',
          800: '#1C1917',
          900: '#131110',
          950: '#0C0A09',
        },
        bronze: {
          50: '#FDF8F0',
          100: '#F9EEDD',
          200: '#F2D7B4',
          300: '#E8BC84',
          400: '#DCA259',
          500: '#C88331',
          600: '#B06C26',
          700: '#8C5220',
          800: '#714221',
          900: '#5E381E',
        },
        academic: {
          navy: '#1E2E42',
          navyLight: '#2B3F5A',
          borderLight: '#E8E3DA',
          borderDark: '#2C3036',
          mutedLight: '#6B665F',
          mutedDark: '#9F9A92',
          cardLight: '#FFFFFF',
          cardDark: '#1A1C20',
          bgLight: '#FAF8F5',
          bgDark: '#121316',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif TC"', '"Songti TC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans TC"', '"PingFang TC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

