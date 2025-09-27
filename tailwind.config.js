/** @type {import('tailwindcss').Config} */
module.exports = {
  // Use the array syntax for class-based dark mode:
  darkMode: ["class"],
  // Combine the content globs from both configs:
  content: [
    "./pages/**/*.{ts,tsx,js,jsx}",
    "./components/**/*.{ts,tsx,js,jsx}",
    "./app/**/*.{ts,tsx,js,jsx}",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  // shadcn uses an empty prefix—leave it blank if you don't need one
  prefix: "",
  theme: {
    // Bring in shadcn’s container settings:
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    // We'll put everything else inside extend so it merges nicely:
    extend: {
      // 1) Fonts from your original config:
      fontFamily: {
        roboto: ["Roboto", "sans-serif"],
      },

      // 2) All the color variables from both configs:
      colors: {
        // shadcn variables:
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Your original background/foreground syntax with <alpha-value>:
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",

        // Blend your accent, primary, secondary, etc.
        // In shadcn's config, they're objects with DEFAULT & foreground.
        // If you want to preserve the ability to do `bg-accent/50`,
        // keep ` / <alpha-value>` on the DEFAULT:
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
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
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
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

        // You had `btn` colors in your original config:
        btn: {
          background: "hsl(var(--btn-background) / <alpha-value>)",
          "background-hover":
            "hsl(var(--btn-background-hover) / <alpha-value>)",
        },
      },

      // 3) Border radius from shadcn’s config:
      borderRadius: {
        md: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      // 4) Your typography settings:
      typography: (theme) => ({
        DEFAULT: {
          css: {
            color: "hsl(var(--foreground))",
            a: {
              color: "hsl(var(--accent))",
              textDecoration: "underline",
              "&:hover": {
                color: "hsl(var(--primary))",
              },
            },
            h1: {
              color: "hsl(var(--foreground))",
            },
            h2: {
              color: "hsl(var(--foreground))",
            },
            h3: {
              color: "hsl(var(--foreground))",
            },
            strong: {
              color: "hsl(var(--foreground))",
            },
            blockquote: {
              color: "hsl(var(--foreground))",
              borderLeftColor: "hsl(var(--accent))",
            },
          },
        },
        dark: {
          css: {
            color: "hsl(var(--foreground))",
            a: {
              color: "hsl(var(--accent))",
              "&:hover": {
                color: "hsl(var(--primary))",
              },
            },
            h1: {
              color: "hsl(var(--foreground))",
            },
            h2: {
              color: "hsl(var(--foreground))",
            },
            h3: {
              color: "hsl(var(--foreground))",
            },
            strong: {
              color: "hsl(var(--foreground))",
            },
            blockquote: {
              color: "hsl(var(--foreground))",
              borderLeftColor: "hsl(var(--accent))",
            },
          },
        },
      }),

      // 5) The keyframes & animations from shadcn’s config:
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
  // Finally, merge your plugins with shadcn’s plugin:
  plugins: [require("@tailwindcss/typography"), require("tailwindcss-animate")],
};
