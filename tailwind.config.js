/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: '#d4c17a', dark: '#0d1014', accent: '#1c232c',
        black: '#0d1014',
        yellow: { 300: '#e2d28f', 400: '#d4c17a', 500: '#c5ae62', 600: '#b39a49' },
        gray: { 400: '#b2bbc7', 500: '#96a2b2', 600: '#8896a8' },
      },
      fontFamily: { sans: ['Poppins', 'sans-serif'], display: ['Poppins', 'sans-serif'] },
    },
  },
  plugins: [],
};
