import type { Config } from 'tailwindcss';
import defaultTheme from 'tailwindcss/defaultTheme';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#f2e8d6',
          accent: '#f7f0e2',
        },
        ink: '#1e2b2a',
        muted: '#5d6b67',
        panel: {
          DEFAULT: '#fff9f0',
          border: '#e2d4c2',
        },
        accent: {
          DEFAULT: '#1f6f6b',
          orange: '#d27c3e',
          green: '#a9b96c',
        },
        status: {
          pending: '#4b5563',
          rendered: '#24478d',
          generating: '#d27c3e',
          complete: '#1f8a5a',
          failed: '#c13c34',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', ...defaultTheme.fontFamily.sans],
        serif: ['Fraunces', ...defaultTheme.fontFamily.serif],
      },
      borderRadius: {
        panel: '18px',
      },
      boxShadow: {
        panel: '0 18px 30px rgba(30, 43, 42, 0.08)',
      },
    },
  },
  plugins: [],
} satisfies Config;
