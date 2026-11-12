import type { Metadata } from "next";
import { ConnectAgents } from "@/components/agents/connect-agents";

export const metadata: Metadata = { title: "Agents" };

export default function AgentsPage() {
  return <ConnectAgents />;
}
