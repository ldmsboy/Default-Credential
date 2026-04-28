/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./guia.html",
    "./public/**/*.html",
    "./assets/js/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        primary: '#6366f1', // Indigo 500
        secondary: '#94a3b8', // Slate 400
        accent: '#06b6d4', // Cyan 500
        dark: {
          900: '#0f172a', // Slate 900
          800: '#1e293b', // Slate 800
          700: '#334155', // Slate 700
        },
        surface: '#1e293b',
      },
      boxShadow: {
        'neon': '0 0 10px rgba(99, 102, 241, 0.5), 0 0 20px rgba(6, 182, 212, 0.3)',
      }
    },
  },
  plugins: [],
}
