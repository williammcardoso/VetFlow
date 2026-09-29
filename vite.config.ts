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
        // Antes tudo de node_modules ia num "vendor" único de 3,4 MB, baixado
        // inteiro no primeiro acesso. Agora só o núcleo (React e Supabase, que
        // a abertura usa de qualquer jeito) tem arquivo fixo; o resto o Rollup
        // divide conforme o uso — PDF, editor de texto, gráficos e Excel só
        // descem quando uma tela que usa é aberta.
        // Não forçar essas bibliotecas grandes em chunks próprios: o Rollup
        // puxa junto dependências pequenas compartilhadas (clsx etc.) e a tela
        // inicial passava a importar o chunk inteiro do PDF/gráficos.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@supabase")) return "vendor-supabase";
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[\\/]/.test(id)) return "vendor-react";
        },
      },
    },
  },
}));