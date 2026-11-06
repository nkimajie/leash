import type { Metadata } from "next";
import { ControlRoom } from "@/components/ControlRoom";

export const metadata: Metadata = { title: "Control room · Leash" };

export default function ControlRoomPage() {
  return <ControlRoom />;
}
