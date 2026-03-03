import { MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Title>SolidStart - Basic</Title>
          <nav class="flex gap-4 p-4">
            <a href="/" class="text-blue-600 hover:underline">
              Index
            </a>
            <a href="/about" class="text-blue-600 hover:underline">
              About
            </a>
            <a href="/design" class="text-blue-600 hover:underline">
              Design
            </a>
          </nav>
          <Suspense>{props.children}</Suspense>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
