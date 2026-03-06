import { createAuthFragment } from "@fragno-dev/auth";
import { databaseAdapter } from "./db";

export const authFragment = createAuthFragment(
  {
    cookieOptions: { sameSite: "Lax", secure: true },
  },
  { databaseAdapter },
);
