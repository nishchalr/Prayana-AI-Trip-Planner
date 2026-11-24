/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#0E0E0E', // Matte gallery obsidian
          elevated: '#151515', // Architectural charcoal
          card: '#181818',
          border: 'rgba(242, 240, 235, 0.12)',
          borderSubtle: 'rgba(242, 240, 235, 0.06)',
          borderStrong: 'rgba(242, 240, 235, 0.24)',
        },
        ink: {
          primary: '#F2F0EB', // Bone white
          secondary: '#8A8882', // Muted warm stone
          muted: '#4A4945', // Inactive neighbor text
          disabled: '#2E2D2B',
        },
        semantic: {
          nominal: '#10B981', // Vitals OK
          caution: '#D97706', // Health / Weather Caution
          hazard: '#DC2626', // Severe Allergy / Hazard Alert
        },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', '"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      letterSpacing: {
        hud: '0.08em',
        wideHud: '0.14em',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.4 },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
