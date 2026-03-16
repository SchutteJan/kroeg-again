import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import { solidStart } from "@solidjs/start/config";

const authPkgDir = resolve(
  dirname(fileURLToPath(import.meta.resolve("@fragno-dev/auth"))),
  "../..",
);

export default defineConfig({
  resolve: {
    alias: {
      "@fragno-dev/auth/solid": resolve(
        authPkgDir,
        "dist/browser/client/solid.js",
      ),
    },
  },
  plugins: [
    tailwindcss(),
    solidStart(),
    nitro(),
  ],
});
