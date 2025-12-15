/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        archival: {
          paper: '#f4e4bc',
          ink: '#2c241b',
          sepia: '#704214',
          accent: '#8b0000', // Deep red for emphasis
          faint: 'rgba(112, 66, 20, 0.1)'
        }
      },
      fontFamily: {
        serif: ['"Crimson Text"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}