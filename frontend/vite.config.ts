import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Porta 8010: a 8000 costuma estar ocupada por outros projetos locais.
  // allowedHosts: libera o acesso pelo túnel do Cloudflare (cloudflared).
  server: { proxy: { "/api": "http://127.0.0.1:8010" }, allowedHosts: [".trycloudflare.com"] },
});
