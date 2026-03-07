import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        "spin-slow": "spin 1.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
