import { useFragno } from "@fragno-dev/core/vanilla";
import { createOtpFragmentClients } from "..";
import type { FragnoPublicClientConfig } from "@fragno-dev/core/client";

export function createOtpFragmentClient(config: FragnoPublicClientConfig = {}) {
  return useFragno(createOtpFragmentClients(config));
}
