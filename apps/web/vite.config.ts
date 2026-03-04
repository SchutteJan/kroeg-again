import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import tailwindcss from "@tailwindcss/vite";

import { solidStart } from "@solidjs/start/config";

export default defineConfig({
  plugins: [tailwindcss(), solidStart(), nitro()],
});
