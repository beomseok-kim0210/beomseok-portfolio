import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#FAFAFA",
        ink: "#111827",
        accent: "#2563EB",
        armi: "#07111F",
        hangarae: "#F7FFFB",
        wedding: "#FFF9F8",
        line: "#E5E7EB",
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "var(--font-display)",
          "Pretendard",
          "Inter",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 24px 80px rgba(17, 24, 39, 0.08)",
        product: "0 40px 120px rgba(17, 24, 39, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
