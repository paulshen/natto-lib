import * as path from "path";
import { defineConfig } from "vite";

module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.ts"),
      name: "NattoEval",
      fileName: (format) => `nattojs-eval.${format}.js`,
    },
    rollupOptions: {
      external: ["@babel/standalone", "mobx"],
      output: {
        globals: {
          mobx: "mobx",
        },
      },
    },
  },
});
