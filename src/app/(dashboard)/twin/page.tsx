import type { Metadata } from "next";
import { TwinProfile } from "@/components/twin/twin-profile";

export const metadata: Metadata = { title: "Your twin" };

export default function TwinPage() {
  return <TwinProfile />;
}
