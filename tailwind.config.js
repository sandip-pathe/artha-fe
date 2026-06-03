module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFF8EF",
        foreground: "#20120A",
        surface: "#FFFFFF",
        accent: "#F6E7D3",
        brand: "#D66A1F",
        text: "#20120A",
        muted: "#6B4B3A",
        border: "#EFDFC9",
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
