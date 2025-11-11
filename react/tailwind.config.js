module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "var(--clr_primary)",
        accent: "var(--clr_contrasting_accent)",
      },
    },
  },
  plugins: [],
}
