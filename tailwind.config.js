/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",   // includes everything inside src/
  ],
  theme: {
  extend: {
    colors: {
      gold: "#D4C17A", // Elegant, luxury gold tone
      dark: "#0A0A0A", // Deep matte background
      accent: "#1E1E1E" // Slightly lighter gray for contrast
    },
    fontFamily: {
      sans: ["Poppins", "sans-serif"],
      display: ["Orbitron", "sans-serif"], // For titles
    },
  },
},

  plugins: [],
}
