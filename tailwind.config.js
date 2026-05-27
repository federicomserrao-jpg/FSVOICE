/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        bg: '#F5F4F0',
        surface: '#FFFFFF',
        surface2: '#F0EFE9',
        border: '#E2E0D8',
        'border-strong': '#C8C6BC',
        ink: '#1A1917',
        ink2: '#6B6A64',
        ink3: '#9E9C95',
        green: { DEFAULT: '#2D6A4F', bg: '#D8F3DC' },
        amber: { DEFAULT: '#7D4F00', bg: '#FFF3CD' },
        blue: { DEFAULT: '#1B4F8A', bg: '#DDE9F8' },
        red: { DEFAULT: '#8B2020', bg: '#FAE0E0' },
      },
      borderRadius: {
        DEFAULT: '10px',
        sm: '6px',
        xl: '14px',
      },
    },
  },
  plugins: [],
}
