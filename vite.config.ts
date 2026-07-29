import { defineConfig, type UserConfig } from "vite";

const config: UserConfig = defineConfig({
  build: {
    lib: {
      entry: "src/index.ts",
      fileName: "index",
      formats: ["es"],
    },
    rolldownOptions: {
      external: [/^react(?:\/.*)?$/, /^react-dom(?:\/.*)?$/],
    },
    sourcemap: true,
  },
});

export default config;
