import { defineConfig } from "vite";

export default defineConfig({
  // Ensure absolute asset paths work when served from S3
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
