import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  appType: "mpa",
  plugins: [
    react(),
    {
      name: "shohstore-html-entry",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const path = req.url?.split("?")[0] || "/";
          if (
            req.method === "GET" &&
            (path === "/" ||
              path === "/index.html" ||
              path === "/admin" ||
              path === "/catalog" ||
              path.startsWith("/product/"))
          )
            req.url = "/frontend.html";
          next();
        });
      },
    },
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: { "/api": `http://127.0.0.1:${process.env.PORT || "3001"}` },
  },
  build: { target: "es2020", rollupOptions: { input: "frontend.html" } },
});
