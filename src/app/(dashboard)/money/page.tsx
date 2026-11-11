import type { Metadata } from "next";
import { ControlRoom } from "@/components/money/control-room";

export const metadata: Metadata = { title: "Control room" };

export default function ControlRoomPage() {
  return <ControlRoom />;
}
