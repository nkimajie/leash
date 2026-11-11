import type { Metadata } from "next";
import { Limits } from "@/components/rules/limits";

export const metadata: Metadata = { title: "Your leash" };

export default function LimitsPage() {
  return <Limits />;
}
