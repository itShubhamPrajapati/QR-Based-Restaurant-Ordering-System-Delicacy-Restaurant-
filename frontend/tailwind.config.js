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
        primary: {
          50: '#fef7ee',
          100: '#fdedd7',
          200: '#fad7ae',
          300: '#f6ba7a',
          400: '#f19343',
          500: '#ed751d',
          600: '#de5b12',
          700: '#b84411',
          800: '#933716',
          900: '#772f15',
        },
        restaurant: {
          dark: '#1a1a2e',
          darker: '#16213e',
          accent: '#ed751d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
