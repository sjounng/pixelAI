import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ["'Press Start 2P'", "monospace"]
      },
      colors: {
        ink: "#0b0b10",
        paper: "#f4f1ea",
        accent: "#ff2e63",
        accent2: "#08d9d6",
        muted: "#9ca3af"
      },
      boxShadow: {
        pixel: "4px 4px 0 0 rgba(0,0,0,0.85)"
      }
    }
  },
  plugins: []
};

export default config;
