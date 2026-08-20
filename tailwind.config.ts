import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#070916",
        ink2: "#0d1022",
        ink3: "#171b35",
        paper: "#F5F6F8",
        amber: "#ff4fc3",
        teal: "#19d9d2",
        violet: "#8b5cf6",
        line: "rgba(245,246,248,0.12)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
