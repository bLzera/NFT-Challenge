import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1440px" },
    },
    extend: {
      fontFamily: {
        // App inteiro em Roboto Mono (self-hosted via @fontsource). sans == mono.
        sans: ['"Roboto Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
        mono: ['"Roboto Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      // Escala tipográfica colapsada dos 54 text styles do Figma (peso/tracking via utilitários).
      fontSize: {
        display: ["2.6875rem", { lineHeight: "4.375rem" }], // Display/43
        "display-sm": ["2rem", { lineHeight: "2.625rem" }], // Display/32
        heading: ["1.75rem", { lineHeight: "2.3125rem" }], // Heading/28
        "heading-sm": ["1.5rem", { lineHeight: "2rem" }], // Heading/24
        title: ["1.25rem", { lineHeight: "1.75rem" }], // Title/20
        "body-lg": ["1.125rem", { lineHeight: "1.5rem" }], // Body Large/18
        body: ["1rem", { lineHeight: "1.3125rem" }], // Body Large/16
        "body-sm": ["0.9375rem", { lineHeight: "1.25rem" }], // Body/15
        label: ["0.875rem", { lineHeight: "1.125rem" }], // Body/14
        caption: ["0.8125rem", { lineHeight: "1rem" }], // Caption/13
        "caption-sm": ["0.75rem", { lineHeight: "1rem" }], // Caption/12
        tiny: ["0.625rem", { lineHeight: "0.8125rem" }], // Tiny/10
      },
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
        // Tokens próprios do design (sem var shadcn) — cores específicas do Figma.
        ink: "#140D0A", // Color/Ink
        "surface-card": "#241612", // Color/Surface Card
        "surface-raised": "#2F1D15", // Color/Surface Raised
        "surface-dark": "#38220F", // Color/Surface Dark
        "accent-text": "#E89B55", // Text/Accent — texto de destaque (preço, nav ativo)
        "secondary-text": "#CFB28C", // Text/Secondary
        coral: "#F0805F", // Text/Coral
        success: "#00A66C", // Color/Success
        error: "#ED1B2E", // Color/Error (= destructive; alias p/ legibilidade)
        amber: "#E3A44E", // Color/Amber
        "border-soft": "#55321F", // Color/Border Soft
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
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
