/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      margin: {
        "align-book-text": ".4em",
      },
      gridTemplateColumns: {
        "book-text": "320px 1fr",
      },
      aspectRatio: {
        book: "389/500",
      },
      scale: {
        85: ".85",
      },
      boxShadow: {
        underline: "0 1.15px 0 0 currentColor",
      },
      screens: {
        xs: "575px",
        "3md": "925px",
      },
    },
  },
  plugins: [],
};
