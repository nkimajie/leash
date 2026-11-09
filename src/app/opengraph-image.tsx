// The preview image shown when a link to Leash is shared (Devpost, Slack, social media).
// Generated once at build time by Next.js.

import { ImageResponse } from "next/og";

export const alt = "Leash: an AI assistant that pays with your PayPal, only inside rules you set";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 80,
        background: "#fafaf9",
        color: "#1c1917",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <svg width="96" height="96" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill="#1c1917" />
          <g transform="translate(4 4)" fill="none" stroke="#ffffff" strokeWidth="2.25" strokeLinecap="round">
            <circle cx="7" cy="7" r="3" />
            <path d="M9.5 9.5 17 17" />
            <path d="M14 20h6v-6" />
          </g>
        </svg>
        <div style={{ fontSize: 64, fontWeight: 700 }}>Leash</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.1 }}>
          Your AI assistant can spend. Your rules decide what money moves.
        </div>
        <div style={{ fontSize: 32, color: "#57534e" }}>
          Claude shops and pays with your PayPal. Anything outside your rules is reserved, not taken, until you say yes.
        </div>
      </div>
    </div>,
    size,
  );
}
