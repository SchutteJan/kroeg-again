import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import type { ParentProps } from "solid-js";
import { Suspense } from "solid-js";
import { Navbar, NavItem } from "~/components/Navbar";
import { PageLayout } from "~/components/PageLayout";
import "./app.css";

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
        </Navbar>
        <Suspense>{props.children}</Suspense>
      </PageLayout>
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
