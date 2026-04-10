/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'legal-bg': '#0A0A0A',
        'legal-surface': '#121212',
        legal: {
          900: '#121212',
          800: '#1A1A1A',
          700: '#2A2A2A',
          400: '#A1A1AA',
          100: '#FFFFFF',
        },
        primary: '#FFC300', // MNC Yellow
        'soft-blue': '#4F8CFF',
        'soft-green': '#22C55E',
        accent: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', 'sans-serif'],
      },
      spacing: {
        '8': '8px',
      }
    },
  },
  plugins: [],
}
