/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        // Use these explicitly in classNames:
        heading: ['"Playfair Display"', "Georgia", "serif"],
        body: ['"Canela"', "Georgia", '"Times New Roman"', "serif"],

        // Optional: remap Tailwind defaults so existing classes don't pull Inter:
        sans: ['"Canela"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        serif: ['"Playfair Display"', "Georgia", "serif"],
      },
      lineHeight: {
        relaxed: "1.75",
        loose: "2",
      },
    },
  },
  plugins: [],
};