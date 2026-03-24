import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#101415",
        surface: "#101415",
        "surface-container-lowest": "#0b0f10",
        "surface-container-low": "#191c1e",
        "surface-container": "#1d2022",
        "surface-container-high": "#272a2c",
        "surface-container-highest": "#323537",
        "surface-variant": "#323537",
        primary: "#b9c7e4",
        "primary-container": "#0a192f",
        secondary: "#e1c290",
        "secondary-fixed": "#fedeaa",
        "secondary-container": "#5b461f",
        outline: "#8f9097",
        "outline-variant": "#44474d",
        "on-background": "#e0e3e5",
        "on-surface": "#e0e3e5",
        "on-surface-variant": "#c5c6cd",
        "on-primary-container": "#74829d",
        "on-secondary": "#402d08",
        vellum: "#f8fafc",
        ink: "#0a192f"
      },
      fontFamily: {
        headline: ["Plus Jakarta Sans", "sans-serif"],
        body: ["Manrope", "sans-serif"],
        label: ["Plus Jakarta Sans", "sans-serif"]
      },
      boxShadow: {
        atmospheric: "0 40px 80px rgba(185, 199, 228, 0.04)"
      },
      letterSpacing: {
        editorial: "-0.04em"
      }
    }
  },
  plugins: []
};

export default config;
