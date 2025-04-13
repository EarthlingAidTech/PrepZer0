/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",  // Update path to match your EJS files
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#60a5fa',
          dark: '#3b82f6'
        },
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617'
        },
        accent: {
          blue: '#60a5fa',
          purple: '#a78bfa',
          green: '#4ade80'
        }
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        oswald: ['Oswald', 'sans-serif'],
        opensans: ['Open Sans', 'sans-serif']
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, var(--tw-colors-primary), var(--tw-colors-primary-dark))',
        'gradient-dark': 'linear-gradient(to bottom, var(--tw-colors-dark-900), var(--tw-colors-dark-950))',
        'grid-pattern': 'linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)'
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in',
        'float': 'float 6s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 3s ease infinite',
        'logo-spin': 'App-logo-spin 20s linear infinite'
      },
      keyframes: {
        fadeIn: {
          'from': { 
            opacity: '0',
            transform: 'translateY(20px)'
          },
          'to': { 
            opacity: '1',
            transform: 'translateY(0)'
          }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' }
        },
        'App-logo-spin': {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' }
        }
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
      boxShadow: {
        'custom': '0 10px 30px -5px rgba(0, 0, 0, 0.1)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(12px)'
      }
    },
  },
  darkMode: 'class',
  plugins: [],
} 