import { Title } from "@solidjs/meta";
import { createAsync, query, redirect, type RouteDefinition } from "@solidjs/router";
import { type ParentProps, Show, Suspense } from "solid-js";
import { getRequestEvent } from "solid-js/web";
import { createAuthServer } from "~/lib/auth-server";

const getAdminUser = query(async () => {
  "use server";
  const event = getRequestEvent();
  if (!event) {
    throw new Error("getAdminUser requires a request event");
  }
  const fragment = createAuthServer(event.locals.pool);
  const res = await fragment.callRoute("GET", "/me", {
    headers: event.request.headers,
  });
  if (res.type !== "json") {
    throw redirect("/login");
  }
  if (res.data.role !== "admin") {
    throw redirect("/");
  }
  return res.data;
}, "admin-user");

export const route: RouteDefinition = {
  preload: () => getAdminUser(),
};

export default function AdminLayout(props: ParentProps) {
  const user = createAsync(() => getAdminUser(), { deferStream: true });

  return (
    <>
      <Title>Admin</Title>
      <Suspense>
        <Show when={user()}>{props.children}</Show>
      </Suspense>
    </>
  );
}
