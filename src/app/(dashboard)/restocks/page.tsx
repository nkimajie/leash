import type { Metadata } from "next";
import { RestockManager } from "@/components/restocks/restock-manager";

export const metadata: Metadata = { title: "Restocks" };

export default function RestocksPage() {
  return <RestockManager />;
}
