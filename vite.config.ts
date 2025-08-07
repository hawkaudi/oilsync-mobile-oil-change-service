import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

// Express middleware for Vite dev server
const expressMiddleware = (): Plugin => {
  return {
    name: "express-middleware",
    configureServer(server) {
      const app = createServer();
      server.middlewares.use("/api", app);
    },
  };
};

export default defineConfig({
  plugins: [react(), expressMiddleware()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  server: {
    port: 8080,
  },
  build: {
    outDir: "dist/spa",
  },
});
