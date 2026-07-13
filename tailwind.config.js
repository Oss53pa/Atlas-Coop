/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette « Terre & Fleuve » — canaux RGB pour supporter l'opacité (bg-primaire/95…)
        fond: 'rgb(var(--fond-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2-rgb) / <alpha-value>)',
        primaire: {
          DEFAULT: 'rgb(var(--primaire-rgb) / <alpha-value>)',
          hover: 'rgb(var(--primaire-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--primaire-active-rgb) / <alpha-value>)',
        },
        action: {
          DEFAULT: 'rgb(var(--action-rgb) / <alpha-value>)',
          hover: 'rgb(var(--action-hover-rgb) / <alpha-value>)',
          active: 'rgb(var(--action-active-rgb) / <alpha-value>)',
        },
        alerte: {
          DEFAULT: 'rgb(var(--alerte-rgb) / <alpha-value>)',
          hover: 'rgb(var(--alerte-hover-rgb) / <alpha-value>)',
        },
        'or-fcfa': 'rgb(var(--or-fcfa-rgb) / <alpha-value>)',
        texte: {
          DEFAULT: 'rgb(var(--texte-rgb) / <alpha-value>)',
          2: 'rgb(var(--texte-2-rgb) / <alpha-value>)',
        },
        ligne: 'rgb(var(--ligne-rgb) / <alpha-value>)',
        'desactive-fond': 'rgb(var(--desactive-fond-rgb) / <alpha-value>)',
        'desactive-texte': 'rgb(var(--desactive-texte-rgb) / <alpha-value>)',
      },
      fontFamily: {
        display: ['"Grand Hotel"', 'cursive'],
        sans: ['Dosis', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderColor: {
        DEFAULT: 'var(--ligne)',
      },
      boxShadow: {
        carte: '0 1px 2px rgba(22, 50, 79, 0.04), 0 2px 8px rgba(22, 50, 79, 0.06)',
        'carte-hover': '0 2px 4px rgba(22, 50, 79, 0.06), 0 8px 24px rgba(22, 50, 79, 0.10)',
        modale: '0 12px 48px rgba(16, 38, 64, 0.24)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'slide-up': 'slide-up 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
};
