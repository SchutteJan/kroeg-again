import { definePlugin } from "nitro";
import { getConfig } from "~/lib/config";

// Fail at startup rather than on the first request that needs the config.
export default definePlugin(() => {
  getConfig();
});
