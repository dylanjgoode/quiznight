/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'nye-gold': '#FFD700',
        'nye-gold-light': '#FFEC8B',
        'nye-gold-dark': '#DAA520',
        'nye-black': '#0A0A0A',
        'nye-dark': '#1A1A1A',
        'nye-purple': '#4A0E4E',
        'nye-pink': '#FF1493',
      },
      animation: {
        'sparkle': 'sparkle 1.5s ease-in-out infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.5s ease-out',
        'confetti': 'confetti 1s ease-out forwards',
        'shake': 'shake 0.5s ease-in-out',
      },
      keyframes: {
        'sparkle': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.5 },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(255, 215, 0, 0.8)' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0)', opacity: 0 },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        'confetti': {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: 1 },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: 0 },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'nye-gradient': 'linear-gradient(135deg, #0A0A0A 0%, #1A1A1A 50%, #2A1A2A 100%)',
      },
    },
  },
  plugins: [],
}
