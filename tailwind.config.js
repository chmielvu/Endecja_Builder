/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        endecja: {
          base: '#1b2d21',   // Deep Forest Green (Backgrounds)
          light: '#3d5c45',  // Lighter Green (Hover states)
          gold: '#d4af37',   // Metallic Gold (Accents/Borders)
          paper: '#f0fdf4',  // Very pale green/patina (Canvas Background)
          ink: '#0f172a',    // Dark Slate (Text)
          alert: '#991b1b',  // Blood Red (Errors/Myths)
        }
      },
      fontFamily: {
        serif: ['"Crimson Text"', 'serif'],
        sans: ['"IBM Plex Sans"', 'sans-serif'], // Changed from "Inter"
        mono: ['"Courier Prime"', 'monospace']
      }
    },
  },
  plugins: [],
}