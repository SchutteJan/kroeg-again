import type { Route } from "./+types/auth";

import { getAuth } from "../../lib/auth.server";

export async function loader({ request }: Route.LoaderArgs) {
  const auth = await getAuth();
  return auth.handler(request);
}

export async function action({ request }: Route.ActionArgs) {
  const auth = await getAuth();
  return auth.handler(request);
}
