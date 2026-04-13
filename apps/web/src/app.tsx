import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import type { ParentProps } from "solid-js";
import { Show, Suspense } from "solid-js";
import { authClient } from "~/lib/auth-client";
import { Navbar, NavItem } from "~/components/Navbar";
import { PageLayout } from "~/components/PageLayout";
import { ToastRegion } from "~/components/Toast";
import "./app.css";

function AuthNav() {
  const me = authClient.useMe();

  return (
    <Show
      when={me.data()}
      fallback={
        <NavItem href="/login" chalkClass="bg-accent-green">
          Sign in
        </NavItem>
      }
    >
      <NavItem href="/user" chalkClass="bg-accent-green">
        Account
      </NavItem>
    </Show>
  );
}

function Layout(props: ParentProps) {
  return (
    <MetaProvider>
      <Title>Kroegen</Title>
      <PageLayout>
        <Navbar brand="Kroegen">
          <NavItem href="/about" chalkClass="bg-accent-red">
            About
          </NavItem>
          <NavItem href="/design" chalkClass="bg-accent-red">
            Design
          </NavItem>
          <div class="ml-auto">
            <AuthNav />
          </div>
        </Navbar>
        <Suspense>{props.children}</Suspense>
      </PageLayout>
      <ToastRegion />
    </MetaProvider>
  );
}

export default function App() {
  return (
    <Router root={Layout}>
      <FileRoutes />
    </Router>
  );
}
