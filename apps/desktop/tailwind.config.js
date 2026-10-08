/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0a',
          card: '#141414',
          subtle: '#181818',
          hover: '#202020'
        },
        border: {
          DEFAULT: '#222222',
          light: '#2e2e2e'
        },
        amber: {
          DEFAULT: '#d4a017',
          dim: 'rgba(212, 160, 23, 0.12)',
          border: 'rgba(212, 160, 23, 0.25)'
        }
      },
      borderRadius: {
        none: '0px',
        DEFAULT: '0px'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'Cascadia Code', 'monospace']
      }
    }
  },
  plugins: []
};
