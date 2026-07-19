import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5810",
        changeOrigin: true
      },
      "/progress": {
        target: "ws://127.0.0.1:5811",
        ws: true,
        changeOrigin: true
      }
    }
  }
});