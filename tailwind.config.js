import forms from "@tailwindcss/forms";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./pb_public/index.html",
    "./pb_public/agent/index.html",
    "./pb_public/agent/receipt.js",
    "./pb_public/distributor/index.html",
    "./pb_public/distributor/distributor.js",
    "./pb_public/admin/index.html",
    "./pb_public/admin/admin.js",
    "./pb_public/js/landing.js",
    "./pb_public/js/reveal.js"
  ],
  theme: {
    extend: {
      colors: {
        "aditya-navy": "#0C4A7B",
        "aditya-dark": "#071E2E",
        "aditya-teal": "#167E88",
        "aditya-gold": "#F59E0B",
        "aditya-amber": "#D97706",
        "temple-base": "#F4F8FA",
        "temple-card": "#FFFFFF",
        "temple-warm": "#EBF3F7",
        "temple-gold": "#F59E0B",
        "temple-amber": "#D97706",
        "temple-saffron": "#0C4A7B",
        "temple-green": "#167E88",
        charcoal: "#071E2E",
        ink: "#071E2E",
        muted: "#567082",
        line: "#DCE7EC"
      },
      fontFamily: {
        odia: ["Anek Odia", "Plus Jakarta Sans", "sans-serif"],
        "display-lg": ["Playfair Display", "EB Garamond", "Anek Odia", "Georgia", "serif"],
        "headline-lg": ["Playfair Display", "EB Garamond", "Anek Odia", "Georgia", "serif"],
        "headline-md": ["Playfair Display", "EB Garamond", "Anek Odia", "Georgia", "serif"],
        "title-lg": ["DM Sans", "Plus Jakarta Sans", "Anek Odia", "sans-serif"],
        "body-lg": ["DM Sans", "Plus Jakarta Sans", "Anek Odia", "sans-serif"],
        "body-md": ["DM Sans", "Plus Jakarta Sans", "Anek Odia", "sans-serif"],
        "finance-display": ["JetBrains Mono", "monospace"],
        "finance-body": ["JetBrains Mono", "monospace"]
      },
      boxShadow: {
        card: "0 10px 30px -8px rgba(7, 30, 46, 0.08), 0 4px 10px -4px rgba(7, 30, 46, 0.04)",
        "card-hover": "0 22px 44px -12px rgba(12, 74, 123, 0.2), 0 8px 16px -8px rgba(7, 30, 46, 0.08)",
        gold: "0 10px 30px -5px rgba(245, 158, 11, 0.15), 0 4px 12px -2px rgba(0, 0, 0, 0.04)"
      }
    }
  },
  plugins: [forms]
};
