import type { Metadata } from "next";
import { RulesForm } from "@/components/rules/rules-form";

export const metadata: Metadata = { title: "Rules" };

export default function RulesPage() {
  return <RulesForm />;
}
