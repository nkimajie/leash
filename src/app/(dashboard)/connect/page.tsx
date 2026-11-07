import type { Metadata } from "next";
import { ConnectPayPal } from "@/components/connect/connect-paypal";

export const metadata: Metadata = { title: "Connect PayPal" };

export default function ConnectPage() {
  return <ConnectPayPal />;
}
