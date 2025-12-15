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
          paper: '#f5f5dc',      // Beige paper
          ink: '#2c241b',        // Dark brown ink
          sepia: '#704214',      // Sepia brown
          accent: '#dc143c',     // Polish flag red
          navy: '#1e3a5f',       // Endecja blue
          gold: '#d4af37',       // Catholic gold
          faint: 'rgba(112, 66, 20, 0.1)'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"Courier Prime"', 'monospace']
      }
    },
  },
  plugins: [],
}