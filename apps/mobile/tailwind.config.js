/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './app/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Enso brand colors
        primary: {
          50: '#f0f5ff',
          100: '#e0ebff',
          200: '#c7d9ff',
          300: '#a3c0ff',
          400: '#7a9cff',
          500: '#5b78f5',
          600: '#4a5ce8',
          700: '#3d47d1',
          800: '#343ca8',
          900: '#303884',
          950: '#1a1a2e',
        },
        // Maslow level colors
        maslow: {
          physiological: '#E57373',
          safety: '#FFB74D',
          love: '#81C784',
          esteem: '#64B5F6',
          actualization: '#BA68C8',
        },
        // Mood colors
        mood: {
          1: '#ef4444',
          2: '#f97316',
          3: '#f59e0b',
          4: '#eab308',
          5: '#84cc16',
          6: '#22c55e',
          7: '#10b981',
          8: '#14b8a6',
          9: '#06b6d4',
          10: '#0ea5e9',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
