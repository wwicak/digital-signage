/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./widgets/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    function ({ addUtilities }) {
      const newUtilities = {
        // Resize handles
        ".react-grid-item > .react-resizable-handle": {
          position: "absolute !important",
          "pointer-events": "auto !important",
          "touch-action": "none !important",
          "z-index": "10 !important",
          opacity: "0",
          transition: "opacity 200ms ease",
        },
        ".react-grid-item:hover > .react-resizable-handle": {
          opacity: "1",
        },
        // Southeast handle (bottom-right)
        ".react-grid-item > .react-resizable-handle.react-resizable-handle-se":
          {
            width: "24px",
            height: "24px",
            bottom: "0",
            right: "0",
            cursor: "se-resize",
          },
        ".react-grid-item > .react-resizable-handle.react-resizable-handle-se::after":
          {
            content: '""',
            position: "absolute",
            right: "6px",
            bottom: "6px",
            width: "8px",
            height: "8px",
            "border-right": "3px solid rgba(123, 192, 67, 0.8)",
            "border-bottom": "3px solid rgba(123, 192, 67, 0.8)",
            "border-radius": "0 0 2px 0",
          },
        // Other resize handles
        ".react-grid-item > .react-resizable-handle.react-resizable-handle-sw":
          {
            width: "24px",
            height: "24px",
            bottom: "0",
            left: "0",
            cursor: "sw-resize",
          },
        ".react-grid-item > .react-resizable-handle.react-resizable-handle-ne":
          {
            width: "24px",
            height: "24px",
            top: "0",
            right: "0",
            cursor: "ne-resize",
          },
        ".react-grid-item > .react-resizable-handle.react-resizable-handle-nw":
          {
            width: "24px",
            height: "24px",
            top: "0",
            left: "0",
            cursor: "nw-resize",
          },
        ".react-grid-item > .react-resizable-handle.react-resizable-handle-s": {
          width: "100%",
          height: "8px",
          bottom: "0",
          left: "0",
          cursor: "s-resize",
        },
        ".react-grid-item > .react-resizable-handle.react-resizable-handle-n": {
          width: "100%",
          height: "8px",
          top: "0",
          left: "0",
          cursor: "n-resize",
        },
        ".react-grid-item > .react-resizable-handle.react-resizable-handle-e": {
          width: "8px",
          height: "100%",
          top: "0",
          right: "0",
          cursor: "e-resize",
        },
        ".react-grid-item > .react-resizable-handle.react-resizable-handle-w": {
          width: "8px",
          height: "100%",
          top: "0",
          left: "0",
          cursor: "w-resize",
        },
        // Widget controls
        ".react-grid-item .controls": {
          "pointer-events": "auto !important",
        },
        ".react-grid-item .no-drag": {
          "pointer-events": "auto !important",
        },
        // Ensure proper sizing for widget content
        ".react-grid-item > div": {
          width: "100% !important",
          height: "100% !important",
        },
        // Touch device optimizations
        "@media (hover: none) and (pointer: coarse)": {
          ".react-grid-item > .react-resizable-handle": {
            width: "32px !important",
            height: "32px !important",
            opacity: "0.7 !important",
          },
          ".react-grid-item": {
            "touch-action": "none !important",
          },
        },
      };
      addUtilities(newUtilities);
    },
  ],
};
