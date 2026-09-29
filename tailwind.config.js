import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pb_public/index.html",
    "./pb_public/agent/index.html",
    "./pb_public/agent/receipt.js",
    "./pb_public/distributor/index.html",
    "./pb_public/distributor/distributor.js",
    "./pb_public/js/landing.js",
    "./pb_public/js/reveal.js"
  ],
  theme: {
    extend: {
      colors: {
        "temple-base": "#FFFDF7",
        "temple-card": "#FFFFFF",
        "temple-warm": "#FFF8EC",
        "temple-gold": "#D97706",
        "temple-amber": "#F59E0B",
        "temple-saffron": "#EA580C",
        "temple-green": "#059669",
        charcoal: "#181A20",
        ink: "#1C1917",
        muted: "#78716C",
        line: "#EFE6D5"
      },
      fontFamily: {
        odia: ["Anek Odia", "Plus Jakarta Sans", "sans-serif"],
        "display-lg": ["EB Garamond", "Anek Odia", "Georgia", "serif"],
        "headline-lg": ["EB Garamond", "Anek Odia", "Georgia", "serif"],
        "headline-md": ["EB Garamond", "Anek Odia", "Georgia", "serif"],
        "title-lg": ["Plus Jakarta Sans", "Anek Odia", "sans-serif"],
        "body-lg": ["Plus Jakarta Sans", "Anek Odia", "sans-serif"],
        "body-md": ["Plus Jakarta Sans", "Anek Odia", "sans-serif"],
        "finance-display": ["JetBrains Mono", "monospace"],
        "finance-body": ["JetBrains Mono", "monospace"]
      },
      boxShadow: {
        card: "0 10px 30px -8px rgba(28, 25, 23, 0.08), 0 4px 10px -4px rgba(28, 25, 23, 0.04)",
        "card-hover": "0 22px 44px -12px rgba(217, 119, 6, 0.18), 0 8px 16px -8px rgba(28, 25, 23, 0.08)",
        gold: "0 10px 30px -5px rgba(217, 119, 6, 0.08), 0 4px 12px -2px rgba(0, 0, 0, 0.04)"
      }
    }
  },
  plugins: [forms]
};
