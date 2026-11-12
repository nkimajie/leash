"use client";

// Your leash, Agents: how to let Claude, or any AI assistant that speaks MCP, shop and pay on your
// leash. Leash's tools are an MCP server at /api/v1/mcp (src/server/leash-api/mcp.ts). An agent goes
// through the same rules and the same PayPal steps as Leash's own assistant, and it can't approve.

import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { Card, CardHeader, WashCard } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Illustration } from "@/components/ui/illustration";
import { Stamp } from "@/components/ui/stamp";

const TOOLS = [
  { name: "search_products", does: "Search real stores, with what your twin thinks of each result." },
  { name: "buy_product", does: "Buy something. Within your rules it's paid; anything else waits for you." },
  { name: "pay_person", does: "Pay someone from your People, through PayPal." },
  { name: "check_decision", does: "See whether you've approved a purchase yet." },
  { name: "read_rules", does: "Read your limits, so it can shop inside them." },
];

const TRY_ASKING = [
  "Use Leash to find fair-trade coffee beans under $20 and buy the best one.",
  "With Leash, pay Sam Rivera $12 for lunch.",
  "What are my Leash limits?",
];

export function ConnectAgents() {
  // The address of this Leash, as your browser sees it (empty for a moment while the page loads).
  const origin = useSyncExternalStore(
    subscribeToNothing,
    () => window.location.origin,
    () => "",
  );
  const address = `${origin}/api/v1/mcp`;

  return (
    <>
      <WashCard className="flex items-center gap-6">
        <div>
          <h2 className="text-xl leading-[26px] font-semibold">Shop from Claude, on your leash</h2>
          <p className="mt-2 max-w-[640px] text-sm">
            Leash is also an MCP server. Connect it to Claude, or any AI assistant that supports MCP, and it can search,
            buy and pay for you. Same rules, same PayPal steps. It can never approve: anything that needs your okay
            waits here for your tap.
          </p>
        </div>
        <Illustration name="boundary-held" className="-my-4 hidden w-40 shrink-0 sm:block" />
      </WashCard>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
        <div className="flex flex-col gap-6 lg:gap-8">
          <Card>
            <CardHeader title="Your Leash address" description="Paste it into your AI assistant." />
            <CopyBox value={address} label="Leash address" />
            <p className="mt-3 text-xs text-ink-soft">
              MCP over HTTP. This demo has one shared leash, so there&apos;s no sign-in.
            </p>
          </Card>

          <Card>
            <CardHeader title="Connect it" />
            <div className="flex flex-col gap-6">
              <Steps title="Claude on the web, Mac or Windows">
                <li>Open Customize, then Connectors.</li>
                <li>Choose + Add, then Add custom connector.</li>
                <li>Name it Leash and paste the address. If it asks how to sign in, choose No sign-in. Then Add.</li>
                <li>Start a new chat and ask Claude to shop with Leash.</li>
              </Steps>
              <Steps title="Claude Code">
                <li>
                  Run this in your terminal:
                  <CopyBox
                    className="mt-2"
                    value={`claude mcp add --transport http leash ${address}`}
                    label="Claude Code command"
                  />
                </li>
              </Steps>
              <Steps title="Any other MCP client">
                <li>Add a remote MCP server (HTTP) with the address above.</li>
              </Steps>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-6 lg:gap-8">
          <Card>
            <CardHeader title="What it can do" description="The same tools Leash's own assistant uses." />
            <ul className="flex flex-col gap-3">
              {TOOLS.map(({ name, does }) => (
                <li key={name} className="grid gap-1 sm:grid-cols-[140px_1fr] sm:gap-3">
                  <code className="font-mono text-[13px] text-leash">{name}</code>
                  <span className="text-sm">{does}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex items-start gap-3 border-t border-hairline pt-4">
              <Stamp tone="blocked" size="compact">
                Approve
              </Stamp>
              <p className="text-sm">There&apos;s no tool to approve. Only you can, here in Leash.</p>
            </div>
          </Card>

          <Card>
            <CardHeader title="Try asking Claude" />
            <ul className="flex flex-col gap-2">
              {TRY_ASKING.map((example) => (
                <li key={example} className="rounded-xl bg-paper px-4 py-3 text-sm">
                  &ldquo;{example}&rdquo;
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-ink-soft">
              Everything it does shows up in{" "}
              <Link href="/money" className="text-leash">
                Money
              </Link>
              , signed with the agent&apos;s name. Building your own agent? The same tools are a REST API, described at{" "}
              <a href="/api/v1/openapi.json" className="text-leash">
                /api/v1/openapi.json
              </a>
              .
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}

function Steps({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      <ol className="mt-2 flex list-decimal flex-col gap-1.5 pl-5 text-sm marker:text-ink-soft">{children}</ol>
    </div>
  );
}

function CopyBox({ value, label, className = "" }: { value: string; label: string; className?: string }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-hairline bg-paper px-3 py-2 ${className}`}>
      <code className="min-w-0 flex-1 font-mono text-[13px] break-all">{value}</code>
      <CopyButton value={value} label={label} />
    </div>
  );
}

const subscribeToNothing = () => () => {};
