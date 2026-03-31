/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // dark mode kullanımı için 'class' ekliyoruz
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
