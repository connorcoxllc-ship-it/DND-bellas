import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        parchment: "#f4ecd8",
        ink: "#2b2118",
        blood: "#7b2d26",
        gold: "#b8860b",
      },
      fontFamily: {
        display: ["Cinzel", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
