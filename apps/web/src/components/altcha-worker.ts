// Proof-of-work solver for <Altcha>. altcha-lib's own `workers/pbkdf2` uses the Node.js
// implementation (`node:crypto`), so this pairs its worker handler with the WebCrypto one.
import { deriveKey } from "altcha-lib/algorithms/web/pbkdf2";
import { handler } from "altcha-lib/workers/shared";

handler({ deriveKey });
