import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      components: fileURLToPath(new URL("./src/components", import.meta.url)),
      hooks: fileURLToPath(new URL("./src/hooks", import.meta.url)),
      shared: fileURLToPath(new URL("./shared", import.meta.url)),
      state: fileURLToPath(new URL("./src/state", import.meta.url)),
      streaming: fileURLToPath(new URL("./src/streaming", import.meta.url)),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
