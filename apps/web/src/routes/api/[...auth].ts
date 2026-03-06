import { authFragment } from "~/lib/auth-server";

export const { GET, POST, PUT, PATCH, DELETE } = authFragment.handlersFor("solid-start");
