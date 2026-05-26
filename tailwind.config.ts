import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Token names kept so existing utilities remap to the sleek theme.
        base: "#08080b",
        surface: "#101015",
        parchment: "#ECECF1", // primary text
        ink: "#0a0a0e", // deep surface / <option> background
        gold: "#8b5cf6", // accent (violet)
        blood: "#6366f1", // primary (indigo)
      },
      fontFamily: {
        display: ["'Space Grotesk'", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.06), 0 20px 60px -20px rgba(99,102,241,0.45)",
      },
      keyframes: {
        floatBlob: {
          "0%": { transform: "translate(0,0) scale(1)" },
          "100%": { transform: "translate(0,-4%) scale(1.08)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        floatBlob: "floatBlob 18s ease-in-out infinite alternate",
        shimmer: "shimmer 6s linear infinite alternate",
      },
    },
  },
  plugins: [],
};

export default config;
