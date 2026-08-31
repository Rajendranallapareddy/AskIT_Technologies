/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#eef2fb', 100: '#d7e0f4', 200: '#b0c1e9', 300: '#88a2dd',
          400: '#5c7dcd', 500: '#3a5cb8', 600: '#284591', 700: '#1e3a8a',
          800: '#162b66', 900: '#0f1d45',
        },
        orange: {
          50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74',
          400: '#fb923c', 500: '#f97316', 600: '#ea580c', 700: '#c2410c',
          800: '#9a3412', 900: '#7c2d12',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 24px -4px rgba(15, 29, 69, 0.10)',
        'card-hover': '0 12px 32px -8px rgba(15, 29, 69, 0.22)',
      },
      backgroundImage: {
        'hero-grid':
          'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-14px)' } },
        'fade-up': { '0%': { opacity: 0, transform: 'translateY(24px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'splash-fade-out': { '0%': { opacity: 1 }, '100%': { opacity: 0 } },
        'splash-logo-in': { '0%': { opacity: 0, transform: 'scale(0.82) translateY(10px)' }, '100%': { opacity: 1, transform: 'scale(1) translateY(0)' } },
        'splash-tagline-in': { '0%': { opacity: 0, transform: 'translateY(8px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'splash-ring': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
        'splash-pulse-dot': { '0%,100%': { transform: 'scale(1)', opacity: 0.5 }, '50%': { transform: 'scale(1.4)', opacity: 1 } },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'fade-up': 'fade-up 0.6s ease-out both',
        'splash-fade-out': 'splash-fade-out 0.45s ease-in forwards',
        'splash-logo-in': 'splash-logo-in 0.7s cubic-bezier(0.16,1,0.3,1) both',
        'splash-tagline-in': 'splash-tagline-in 0.6s ease-out 0.35s both',
        'splash-ring': 'splash-ring 1.4s linear infinite',
        'splash-pulse-dot': 'splash-pulse-dot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
