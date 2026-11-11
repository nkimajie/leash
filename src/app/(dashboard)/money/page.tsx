import type { Metadata } from "next";
import { MoneyPage } from "@/components/money/money-page";

export const metadata: Metadata = { title: "Money" };

export default function Money() {
  return <MoneyPage />;
}
