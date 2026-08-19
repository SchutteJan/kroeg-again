import { A } from "@solidjs/router";
import { Card } from "~/components/Card";
import { PageContent } from "~/components/PageLayout";

export default function AdminHome() {
  return (
    <PageContent class="flex items-start justify-center pt-16">
      <Card class="w-full max-w-2xl p-6">
        <h1 class="text-ink-900 mb-6 text-2xl font-bold">Admin Panel</h1>
        <ul class="space-y-2 text-sm">
          <li>
            <A href="/admin/licenses" class="text-primary-500 hover:underline">
              Licenses
            </A>
          </li>
        </ul>
      </Card>
    </PageContent>
  );
}
