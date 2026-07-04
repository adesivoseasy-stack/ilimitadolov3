import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: "es2020",
    cssCodeSplit: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (id.includes("react-router")) return "react-vendor";
          if (/[\\/]react(-dom)?[\\/]/.test(id)) return "react-vendor";
          if (id.includes("@supabase")) return "supabase-vendor";
          if (id.includes("@tanstack/react-query")) return "query-vendor";
          if (id.includes("recharts") || id.includes("d3-")) return "charts-vendor";
          if (id.includes("framer-motion")) return "motion-vendor";
          if (id.includes("@radix-ui")) return "radix-vendor";
          if (id.includes("date-fns")) return "date-vendor";
          if (id.includes("lucide-react")) return "icons-vendor";
          if (id.includes("jszip")) return "jszip-vendor";
        },
      },
    },
  },
}));
