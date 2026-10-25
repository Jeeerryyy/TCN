/* Brex Design System – Fintech Modern, High-Contrast, Inter Typography */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brex: {
          primary: '#15191E',
          black: '#000000',
          orange: '#FF5900',
          'orange-hover': '#E64E00',
          'orange-active': '#CC4400',
          error: '#FF3D00',
          'error-red': '#EE2929',
          yellow: '#FFA500',
          blue: '#006EF5',
          purple: '#3C16D5',
          green: '#0D9926',
          'green-bright': '#1EC425',
          'green-bg': '#D1F4D2',
          'blue-bg': '#D5E8FB',
          'purple-bg': '#E6E2FF',
          secondary: '#60646C',
          tertiary: '#8B8D98',
          border: '#B9BBC6',
          'border-subtle': '#E6E2FF',
          warm: '#6F737B',
          'surface-offwhite': '#FCFCFD',
          'surface-white': '#FFFFFF',
          'surface-light': '#F3F3F7',
        },
        // Fallback mappings to maintain full backward compatibility while adopting Brex
        apple: {
          canvas: '#F3F3F7',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          border: '#B9BBC6',
          'border-hairline': '#E6E2FF',
          blue: '#FF5900', // Mapped to Brex Action Orange
          'blue-hover': '#E64E00',
          green: '#0D9926',
          red: '#FF3D00',
          orange: '#FF5900',
          yellow: '#FFA500',
          purple: '#3C16D5',
          gray: '#60646C',
          'gray-light': '#F3F3F7',
          text: '#15191E',
          secondary: '#60646C',
        },
        tcn: {
          bg: '#F3F3F7',
          surface: '#FFFFFF',
          panel: '#FFFFFF',
          border: '#B9BBC6',
          'border-light': '#E6E2FF',
          gold: '#FF5900',
          'gold-light': '#FFA500',
          'gold-dark': '#E64E00',
          emerald: '#0D9926',
          crimson: '#FF3D00',
          amber: '#FFA500',
          cyan: '#006EF5',
          indigo: '#3C16D5',
          slate: '#60646C'
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace']
      },
      borderRadius: {
        'brex-sm': '6px',
        'brex-md': '8px',
        'brex-lg': '10px',
        'apple-btn': '8px',
        'apple-card': '8px',
        'apple-badge': '6px',
        'apple-input': '6px'
      },
      boxShadow: {
        'brex-1': '0px 2px 8px rgba(0, 0, 0, 0.08)',
        'brex-2': '0px 4px 16px rgba(0, 0, 0, 0.12)',
        'brex-3': '0px 8px 24px rgba(0, 0, 0, 0.15)',
        'brex-4': '0px 12px 32px rgba(0, 0, 0, 0.20)',
        'brex-focus': '0px 0px 0px 3px rgba(0, 110, 245, 0.12)',
        'apple-btn': '0px 2px 8px rgba(0, 0, 0, 0.08)',
        'apple-card': '0px 2px 8px rgba(0, 0, 0, 0.08)',
        'apple-modal': '0px 8px 24px rgba(0, 0, 0, 0.15)'
      }
    },
  },
  plugins: [],
};
