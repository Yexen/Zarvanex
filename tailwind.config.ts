import type { Config } from 'tailwindcss';

export default {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#72D4CC',
          dark: '#3D9B93',
          darker: '#3D5A67',
          light: '#8ee0d9',
        },
        accent: {
          DEFAULT: '#3D9B93',
          light: '#72D4CC',
        },
        background: {
          DEFAULT: '#2a2a2a',
          dark: '#1f1f1f',
          light: '#353535',
          card: '#242424',
          elevated: '#2f2f2f',
        },
        text: {
          DEFAULT: '#E8E8E8',
          muted: '#B5B5B5',
          dark: '#808080',
        },
        'almost-black': '#2C3E50',
      },
      fontFamily: {
        mono: ['"Courier New"', 'Courier', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, #72D4CC 0%, #3D9B93 100%)',
        'gradient-accent': 'linear-gradient(135deg, #3D9B93 0%, #72D4CC 100%)',
        'mesh-gradient': 'radial-gradient(at 40% 20%, rgba(114, 212, 204, 0.08) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(61, 155, 147, 0.08) 0px, transparent 50%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(114, 212, 204, 0.3)',
        'glow': '0 0 20px rgba(114, 212, 204, 0.4)',
        'glow-lg': '0 0 30px rgba(114, 212, 204, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(114, 212, 204, 0.1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
