/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Google Finance dark theme colors
        dark: {
          bg: '#0f0f0f',
          surface: '#1a1a1a',
          card: '#242424',
          border: '#2d2d2d',
          text: {
            primary: '#e8eaed',
            secondary: '#9aa0a6',
            muted: '#5f6368',
          },
          accent: {
            green: '#34a853',
            red: '#ea4335',
            blue: '#4285f4',
          },
        },
      },
    },
  },
  plugins: [],
}
