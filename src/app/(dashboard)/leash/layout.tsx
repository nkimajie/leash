// Your leash: the rules Leash shops and pays within, in five tabs.

import { LeashTabs } from "@/components/rules/leash-tabs";
import { Page } from "@/components/ui/page";
import { PageHeader } from "@/components/ui/page-header";

export default function LeashLayout({ children }: LayoutProps<"/leash">) {
  return (
    <Page>
      <PageHeader title="Your leash" description="Clear rules. A little room to act. You stay in charge." />
      <LeashTabs />
      {children}
    </Page>
  );
}
