/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      colors: {
        pf: {
          bg: 'hsl(var(--pf-bg))',
          surface: 'hsl(var(--pf-surface))',
          text: 'hsl(var(--pf-text))',
          muted: 'hsl(var(--pf-muted))',
          stroke: 'hsl(var(--pf-stroke))',
          accent: 'hsl(var(--pf-accent))',
        },
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
        /* Semáforo KPI */
        semaforo: {
          verde: "hsl(var(--semaforo-verde))",
          amarillo: "hsl(var(--semaforo-amarillo))",
          rojo: "hsl(var(--semaforo-rojo))",
        },
        /* Estados de acciones */
        status: {
          pendiente: "hsl(var(--status-pendiente))",
          hoy: "hsl(var(--status-hoy))",
          ejecucion: "hsl(var(--status-ejecucion))",
          bloqueado: "hsl(var(--status-bloqueado))",
          hecho: "hsl(var(--status-hecho))",
          verificado: "hsl(var(--status-verificado))",
        },
        /* Sidebar (Dark Premium) */
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          accent: "hsl(var(--sidebar-accent))",
        },
      },
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-success": "var(--gradient-success)",
        "gradient-warning": "var(--gradient-warning)",
        "gradient-danger": "var(--gradient-danger)",
        "gradient-dark": "var(--gradient-dark)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
