import type { Metadata } from "next";
import { ConnectPayPal } from "@/components/connect/connect-paypal";

export const metadata: Metadata = { title: "PayPal" };

export default function PayPalPage() {
  return <ConnectPayPal />;
}
