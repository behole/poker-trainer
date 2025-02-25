/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ff0080', // Hot pink primary
          50: '#ffe6f2',
          100: '#ffcce5',
          200: '#ff99cb',
          300: '#ff66b2',
          400: '#ff3399',
          500: '#ff0080',
          600: '#cc0066',
          700: '#99004d',
          800: '#660033',
          900: '#33001a',
          950: '#1a000d',
        },
        secondary: {
          DEFAULT: '#00bfff', // Deep sky blue
          50: '#e6f9ff',
          100: '#ccf3ff',
          200: '#99e6ff',
          300: '#66daff',
          400: '#33cdff',
          500: '#00bfff',
          600: '#0099cc',
          700: '#007399',
          800: '#004c66',
          900: '#002633',
          950: '#001319',
        },
        accent: {
          DEFAULT: '#33ff00', // Bright green
          50: '#ebffe6',
          100: '#d6ffcc',
          200: '#adff99',
          300: '#85ff66',
          400: '#5cff33',
          500: '#33ff00',
          600: '#29cc00',
          700: '#1f9900',
          800: '#146600',
          900: '#0a3300',
          950: '#051a00',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}