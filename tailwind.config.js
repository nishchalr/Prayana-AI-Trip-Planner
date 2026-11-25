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
          DEFAULT: 'var(--bg-canvas)',
          elevated: 'var(--bg-surface)',
          card: 'var(--bg-elevated)',
          border: 'var(--hairline)',
          borderSubtle: 'var(--hairline-subtle)',
          borderStrong: 'var(--hairline-strong)',
        },
        ink: {
          primary: 'var(--ink-primary)',
          secondary: 'var(--ink-secondary)',
          muted: 'var(--ink-muted)',
          disabled: 'var(--ink-disabled)',
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
