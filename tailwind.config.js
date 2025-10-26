/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores da Pastoral Familiar
        'pastoral-blue': {
          50: '#e6f1ff',
          100: '#cce3ff',
          200: '#99c7ff',
          300: '#66abff',
          400: '#338fff',
          500: '#0056A3', // Azul principal da Pastoral
          600: '#004580',
          700: '#003460',
          800: '#002340',
          900: '#001220',
        },
        // Cores da Paróquia
        'paroquia-gold': {
          50: '#fefcf3',
          100: '#fdf9e7',
          200: '#fbf3cf',
          300: '#f9edb7',
          400: '#f7e79f',
          500: '#D4AF37', // Dourado
          600: '#b8962f',
          700: '#9c7d27',
          800: '#80641f',
          900: '#644b17',
        },
        'paroquia-dark': {
          50: '#f5f5f5',
          100: '#e0e0e0',
          200: '#c2c2c2',
          300: '#a3a3a3',
          400: '#858585',
          500: '#1a1a1a', // Preto da Paróquia
          600: '#141414',
          700: '#0f0f0f',
          800: '#0a0a0a',
          900: '#050505',
        },
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
