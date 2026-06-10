import { defineConfig } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [dyadComponentTagger(), react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["lucide-react", "react-icons"], // Excluir lucide-react e react-icons da otimização de dependências
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("@tiptap")) return "vendor-tiptap";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("react-pdf") || id.includes("@react-pdf")) return "vendor-pdf";
            return "vendor";
          }
        },
      },
    },
  },
}));