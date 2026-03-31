/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // use 'class' strategy for dark mode toggling
  theme: {
    extend: {
      colors: {
        theme: {
          1: 'var(--theme-color-1)',
          2: 'var(--theme-color-2)',
        }
      },
      fontFamily: {
        sans: ['Geologica', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
