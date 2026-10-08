import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";
import { solidStart } from "@solidjs/start/config";
import { assertValidConfig, loadConfig } from "./src/lib/config.ts";

const authPkgDir = resolve(
  dirname(fileURLToPath(import.meta.resolve("@fragno-dev/auth"))),
  "../..",
);

export default defineConfig(({ command, mode }) => {
  // The Nitro plugin below only runs on the first request in dev, so check here too.
  if (command === "serve") {
    assertValidConfig(loadConfig(loadEnv(mode, process.cwd(), "")));
  }

  return {
    resolve: {
      alias: {
        "@fragno-dev/auth/solid": resolve(authPkgDir, "dist/browser/client/solid.js"),
      },
    },
    plugins: [
      tailwindcss(),
      solidStart({ middleware: "./src/middleware.ts" }),
      nitro({ plugins: ["./src/server-plugins/validate-config.ts"] }),
    ],
  };
});
