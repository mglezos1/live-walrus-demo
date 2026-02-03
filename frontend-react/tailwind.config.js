/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        owner: {
          primary: '#667eea',
          secondary: '#764ba2',
        },
        researcher: {
          primary: '#11998e',
          secondary: '#38ef7d',
        },
        verifier: {
          primary: '#f093fb',
          secondary: '#f5576c',
        },
      },
      backgroundImage: {
        'owner-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'researcher-gradient': 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        'verifier-gradient': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      },
    },
  },
  plugins: [],
}
