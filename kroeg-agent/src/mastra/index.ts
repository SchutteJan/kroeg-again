import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore } from "@mastra/libsql";
import { PinoLogger } from "@mastra/loggers";
import { webAgent } from "./agents/web-agent";
import { kroegAgent } from "./agents/kroeg-agent";

export const mastra = new Mastra({
  storage: new LibSQLStore({
    // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  agents: { webAgent, kroegAgent },
  logger: new PinoLogger({
    name: "Mastra",
    level: "info",
  }),
  observability: {
    default: {
      enabled: true,
    },
  },
});
