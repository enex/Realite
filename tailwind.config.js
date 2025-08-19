/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./components/**/*.{js,jsx,ts,tsx}", "./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Concrete color values for React Native (NativeWind). Avoid CSS variables.
        border: "#e5e7eb",
        input: "#e5e7eb",
        ring: "#a1a1aa",
        background: "#ffffff",
        foreground: "#0a0a0a",
        primary: {
          DEFAULT: "#6366F1", // approx. hsl(243, 80%, 59%)
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#f4f4f5",
          foreground: "#0a0a0a",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#f8fafc",
        },
        muted: {
          DEFAULT: "#f4f4f5",
          foreground: "#71717a",
        },
        accent: {
          DEFAULT: "#f4f4f5",
          foreground: "#0a0a0a",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#0a0a0a",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#0a0a0a",
        },
      },
      borderColor: {
        DEFAULT: "#e5e7eb",
      },
    },
  },
  plugins: [],
};
